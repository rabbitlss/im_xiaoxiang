import {
  WebSocketMessage,
  WebSocketEvent,
  TypingData,
  UserStatusData,
  MessageResponse,
} from '@/types/api';
import { JWTAuthService, AuthEvent } from './JWTAuthService';
import { NetworkManager } from '@/utils/NetworkManager';
import { logger } from '@/utils';
import { ENV_CONFIG } from '@/utils/Environment';

// WebSocket状态
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// WebSocket配置
export interface WebSocketConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  protocols?: string[];
}

// WebSocket事件监听器
export type WebSocketEventListener<T = any> = (data: T) => void;

export class WebSocketService {
  private static instance: WebSocketService;
  private ws: WebSocket | null = null;
  private authService: JWTAuthService;
  private networkManager: NetworkManager;
  
  private config: WebSocketConfig;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private connectionTimer: any = null;
  
  private eventListeners: Map<WebSocketEvent, WebSocketEventListener[]> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private requestCallbacks: Map<string, { resolve: (data: any) => void; reject: (error: any) => void }> = new Map();

  private constructor() {
    this.authService = JWTAuthService.getInstance();
    this.networkManager = NetworkManager.getInstance();
    
    this.config = {
      url: ENV_CONFIG.wsUrl,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      connectionTimeout: 10000,
    };

    // 监听认证状态变化
    this.authService.addEventListener(AuthEvent.LOGOUT, () => {
      this.disconnect();
    });

    // 监听网络状态变化
    this.networkManager.addListener((networkInfo) => {
      if (!networkInfo.isConnected && this.state === WebSocketState.CONNECTED) {
        this.handleNetworkDisconnect();
      } else if (networkInfo.isConnected && this.state === WebSocketState.DISCONNECTED) {
        this.connect();
      }
    });
  }

  public static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // 连接WebSocket
  public async connect(): Promise<void> {
    if (this.state === WebSocketState.CONNECTING || this.state === WebSocketState.CONNECTED) {
      logger.debug('WebSocketService', 'Already connecting or connected');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      logger.warn('WebSocketService', 'Cannot connect without authentication');
      return;
    }

    if (!this.networkManager.isConnected()) {
      logger.warn('WebSocketService', 'Cannot connect without network');
      return;
    }

    try {
      this.setState(WebSocketState.CONNECTING);
      logger.info('WebSocketService', 'Connecting to WebSocket server');

      const token = this.authService.getAccessToken();
      const deviceId = await this.getDeviceId();
      const url = `${this.config.url}?token=${encodeURIComponent(token!)}&deviceId=${encodeURIComponent(deviceId)}`;

      this.ws = new WebSocket(url, this.config.protocols);
      this.setupWebSocketHandlers();
      
      // 设置连接超时
      this.connectionTimer = setTimeout(() => {
        if (this.state === WebSocketState.CONNECTING) {
          this.handleConnectionTimeout();
        }
      }, this.config.connectionTimeout);

    } catch (error) {
      logger.error('WebSocketService', 'Failed to create WebSocket connection', error);
      this.handleConnectionError(error);
    }
  }

  // 断开连接
  public disconnect(): void {
    logger.info('WebSocketService', 'Disconnecting WebSocket');
    
    this.clearTimers();
    this.reconnectAttempts = 0;
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.setState(WebSocketState.DISCONNECTED);
  }

  // 发送消息
  public async send<T = any>(message: Omit<WebSocketMessage<T>, 'requestId'>): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = this.generateRequestId();
      const fullMessage: WebSocketMessage<T> = {
        ...message,
        requestId,
      };

      // 如果连接正常，直接发送
      if (this.state === WebSocketState.CONNECTED && this.ws) {
        try {
          this.ws.send(JSON.stringify(fullMessage));
          
          // 如果需要响应，设置回调
          if (this.needsResponse(message.event)) {
            this.requestCallbacks.set(requestId, { resolve, reject });
            
            // 设置请求超时
            setTimeout(() => {
              if (this.requestCallbacks.has(requestId)) {
                this.requestCallbacks.delete(requestId);
                reject(new Error('Request timeout'));
              }
            }, 10000);
          } else {
            resolve(undefined as T);
          }
        } catch (error) {
          reject(error);
        }
      } else {
        // 连接不可用，加入队列
        this.messageQueue.push(fullMessage);
        logger.debug('WebSocketService', 'Message queued for later sending', { event: message.event });
        resolve(undefined as T);
      }
    });
  }

  // 发送心跳
  private sendHeartbeat(): void {
    this.send({
      type: 'heartbeat',
      event: WebSocketEvent.HEARTBEAT,
      data: { timestamp: Date.now() },
    }).catch(error => {
      logger.warn('WebSocketService', 'Heartbeat failed', error);
    });
  }

  // 处理接收到的消息
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      logger.debug('WebSocketService', 'Received message', { 
        type: message.type, 
        event: message.event 
      });

      // 处理响应消息
      if (message.requestId && this.requestCallbacks.has(message.requestId)) {
        const callback = this.requestCallbacks.get(message.requestId)!;
        this.requestCallbacks.delete(message.requestId);
        callback.resolve(message.data);
        return;
      }

      // 处理事件消息
      this.handleEventMessage(message);
    } catch (error) {
      logger.error('WebSocketService', 'Failed to parse message', error);
    }
  }

  // 处理事件消息
  private handleEventMessage(message: WebSocketMessage): void {
    const listeners = this.eventListeners.get(message.event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(message.data);
        } catch (error) {
          logger.error('WebSocketService', 'Event listener error', { event: message.event, error });
        }
      });
    }

    // 处理特殊事件
    switch (message.event) {
      case WebSocketEvent.HEARTBEAT:
        // 心跳响应，不需要特殊处理
        break;
      case WebSocketEvent.ERROR:
        logger.error('WebSocketService', 'Server error', message.data);
        break;
    }
  }

  // 设置WebSocket事件处理器
  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      logger.info('WebSocketService', 'WebSocket connected');
      this.clearTimers();
      this.setState(WebSocketState.CONNECTED);
      this.reconnectAttempts = 0;
      
      // 发送队列中的消息
      this.sendQueuedMessages();
      
      // 开始心跳
      this.startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.handleMessage(event);
    };

    this.ws.onclose = (event) => {
      logger.info('WebSocketService', 'WebSocket closed', { 
        code: event.code, 
        reason: event.reason 
      });
      
      this.clearTimers();
      this.setState(WebSocketState.DISCONNECTED);
      
      // 如果不是正常关闭，尝试重连
      if (event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (event) => {
      logger.error('WebSocketService', 'WebSocket error', event);
      this.handleConnectionError(new Error('WebSocket connection error'));
    };
  }

  // 处理连接错误
  private handleConnectionError(_error: any): void {
    this.clearTimers();
    this.setState(WebSocketState.ERROR);
    this.attemptReconnect();
  }

  // 处理连接超时
  private handleConnectionTimeout(): void {
    logger.warn('WebSocketService', 'Connection timeout');
    if (this.ws) {
      this.ws.close();
    }
    this.handleConnectionError(new Error('Connection timeout'));
  }

  // 处理网络断开
  private handleNetworkDisconnect(): void {
    logger.info('WebSocketService', 'Network disconnected');
    this.clearTimers();
    this.setState(WebSocketState.DISCONNECTED);
  }

  // 尝试重连
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error('WebSocketService', 'Max reconnect attempts reached');
      this.setState(WebSocketState.ERROR);
      return;
    }

    if (!this.authService.isAuthenticated() || !this.networkManager.isConnected()) {
      logger.debug('WebSocketService', 'Skipping reconnect due to auth or network status');
      return;
    }

    this.reconnectAttempts++;
    this.setState(WebSocketState.RECONNECTING);
    
    const delay = Math.min(this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    logger.info('WebSocketService', `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // 发送队列中的消息
  private sendQueuedMessages(): void {
    if (this.messageQueue.length === 0) return;

    logger.info('WebSocketService', `Sending ${this.messageQueue.length} queued messages`);
    
    const messages = [...this.messageQueue];
    this.messageQueue = [];
    
    messages.forEach(message => {
      if (this.ws && this.state === WebSocketState.CONNECTED) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error('WebSocketService', 'Failed to send queued message', error);
          // 重新加入队列
          this.messageQueue.push(message);
        }
      }
    });
  }

  // 开始心跳
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatInterval);
  }

  // 清理定时器
  private clearTimers(): void {
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 设置状态
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      logger.debug('WebSocketService', `State changed: ${oldState} -> ${newState}`);
    }
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 获取WebSocket URL (已移至ENV_CONFIG)
  private getWebSocketUrl(): string {
    return ENV_CONFIG.wsUrl;
  }

  // 获取设备ID
  private async getDeviceId(): Promise<string> {
    // 这里应该从SecureStorage获取
    return 'device_placeholder';
  }

  // 判断是否需要响应
  private needsResponse(_event: WebSocketEvent): boolean {
    // 大部分事件不需要响应，只有特定的命令需要
    return false;
  }

  // 公共方法

  // 添加事件监听器
  public addEventListener<T = any>(event: WebSocketEvent, listener: WebSocketEventListener<T>): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.push(listener);

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // 获取当前状态
  public getState(): WebSocketState {
    return this.state;
  }

  // 获取连接状态
  public isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  // 更新配置
  public updateConfig(config: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 便捷方法：发送新消息事件
  public async sendNewMessage(message: MessageResponse): Promise<void> {
    await this.send({
      type: 'message',
      event: WebSocketEvent.NEW_MESSAGE,
      data: message,
    });
  }

  // 便捷方法：发送正在输入状态
  public async sendTypingStatus(chatId: string, isTyping: boolean): Promise<void> {
    const data: TypingData = {
      chatId,
      userId: this.authService.getCurrentUser()?.id || '',
      isTyping,
    };
    
    await this.send({
      type: 'typing',
      event: WebSocketEvent.TYPING,
      data,
    });
  }

  // 便捷方法：发送用户状态更新
  public async sendUserStatus(status: string): Promise<void> {
    const data: UserStatusData = {
      userId: this.authService.getCurrentUser()?.id || '',
      status: status as any,
      lastSeen: new Date().toISOString(),
    };
    
    await this.send({
      type: 'status',
      event: WebSocketEvent.USER_STATUS,
      data,
    });
  }

  // 销毁服务
  public destroy(): void {
    this.disconnect();
    this.eventListeners.clear();
    this.messageQueue = [];
    this.requestCallbacks.clear();
    logger.info('WebSocketService', 'Service destroyed');
  }
}

// 创建默认实例
export const webSocketService = WebSocketService.getInstance();