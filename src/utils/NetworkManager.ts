import { ENV_CONFIG } from './Environment';

// 网络信息接口
interface NetInfoState {
  isConnected: boolean | null;
  type: string;
  details?: {
    strength?: number;
    responseTime?: number;
    successRate?: number;
  };
}

interface NetInfoAPI {
  addEventListener: (listener: (state: NetInfoState) => void) => () => void;
  fetch: () => Promise<NetInfoState>;
}

// 网络检测配置接口
interface NetworkDetectionConfig {
  healthCheckUrls: string[];
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  monitoringInterval: number;
  reachabilityThreshold: number;
}

// 从环境配置获取网络检测设置
function getNetworkConfig(): NetworkDetectionConfig {
  const defaultConfig: NetworkDetectionConfig = {
    healthCheckUrls: [
      'https://api.xiaoxiang.com/health',
      'https://www.cloudflare.com/cdn-cgi/trace',
      'https://httpbin.org/status/200'
    ],
    connectionTimeout: 8000,
    retryAttempts: 3,
    retryDelay: 1000,
    monitoringInterval: 15000,
    reachabilityThreshold: 0.6 // 60%的URL可达即认为网络正常
  };

  // 开发环境使用本地健康检查
  if (ENV_CONFIG.isDev) {
    return {
      ...defaultConfig,
      healthCheckUrls: [
        'http://localhost:3000/health',
        ...defaultConfig.healthCheckUrls
      ],
      connectionTimeout: 5000,
      monitoringInterval: 10000
    };
  }

  return defaultConfig;
}

// 生产级网络检测服务
function createNetInfoService(): NetInfoAPI {
  const config = getNetworkConfig();
  
  let currentState: NetInfoState = {
    isConnected: null, // 初始状态未知
    type: 'unknown',
    details: { strength: undefined }
  };
  
  const listeners: Set<(state: NetInfoState) => void> = new Set();
  let isMonitoring = false;
  let monitoringTimer: any = null;

  // 真实的网络连接检测
  const checkNetworkReachability = async (): Promise<{
    isReachable: boolean;
    responseTime: number;
    successRate: number;
  }> => {
    const results: { success: boolean; responseTime: number }[] = [];
    
    for (const url of config.healthCheckUrls) {
      for (let attempt = 0; attempt < config.retryAttempts; attempt++) {
        const startTime = Date.now();
        
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(), 
            config.connectionTimeout
          );
          
          const response = await fetch(url, {
            method: 'HEAD',
            cache: 'no-cache',
            mode: 'no-cors',
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          const responseTime = Date.now() - startTime;
          
          results.push({ 
            success: response.ok || response.type === 'opaque', 
            responseTime 
          });
          break; // 成功则跳出重试循环
          
        } catch (error) {
          const responseTime = Date.now() - startTime;
          results.push({ success: false, responseTime });
          
          if (attempt < config.retryAttempts - 1) {
            await new Promise(resolve => 
              setTimeout(resolve, config.retryDelay * (attempt + 1))
            );
          }
        }
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const successRate = successCount / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    
    return {
      isReachable: successRate >= config.reachabilityThreshold,
      responseTime: avgResponseTime,
      successRate
    };
  };

  // 检测网络类型和质量
  const detectNetworkType = async (reachability: any): Promise<NetInfoState> => {
    const { isReachable, responseTime, successRate } = reachability;
    
    if (!isReachable) {
      return {
        isConnected: false,
        type: 'none',
        details: { strength: 0 }
      };
    }
    
    // 根据响应时间和成功率评估网络质量
    let networkStrength: number;
    let networkType: string = 'unknown';
    
    if (responseTime < 100 && successRate > 0.9) {
      networkStrength = 5; // 优秀
      networkType = 'wifi'; // 高速连接通常是wifi
    } else if (responseTime < 300 && successRate > 0.8) {
      networkStrength = 4; // 良好
      networkType = 'wifi';
    } else if (responseTime < 1000 && successRate > 0.7) {
      networkStrength = 3; // 一般
      networkType = 'cellular'; // 较慢连接可能是移动网络
    } else if (responseTime < 3000 && successRate > 0.5) {
      networkStrength = 2; // 较差
      networkType = 'cellular';
    } else {
      networkStrength = 1; // 很差
      networkType = 'cellular';
    }
    
    return {
      isConnected: true,
      type: networkType,
      details: { 
        strength: networkStrength,
        responseTime,
        successRate: Math.round(successRate * 100)
      }
    };
  };

  // 执行完整的网络状态检测
  const performNetworkCheck = async (): Promise<NetInfoState> => {
    try {
      const reachability = await checkNetworkReachability();
      return await detectNetworkType(reachability);
    } catch (error) {
      console.error('Network check failed:', error);
      return {
        isConnected: false,
        type: 'none',
        details: { strength: 0 }
      };
    }
  };

  // 开始网络监控
  const startNetworkMonitoring = () => {
    if (isMonitoring) return () => {};
    
    isMonitoring = true;
    
    const runMonitoring = async () => {
      const newState = await performNetworkCheck();
      
      // 只有在连接状态或网络类型发生变化时才通知
      if (newState.isConnected !== currentState.isConnected || 
          newState.type !== currentState.type) {
        const oldState = currentState;
        currentState = newState;
        
        console.info('Network state changed:', {
          from: oldState,
          to: newState
        });
        
        listeners.forEach(listener => {
          try {
            listener(currentState);
          } catch (error) {
            console.error('Network listener error:', error);
          }
        });
      } else {
        // 仅更新状态，不触发监听器
        currentState = newState;
      }
    };
    
    // 立即执行一次检测
    runMonitoring();
    
    // 定期检测
    monitoringTimer = setInterval(runMonitoring, config.monitoringInterval);
    
    return () => {
      isMonitoring = false;
      if (monitoringTimer) {
        clearInterval(monitoringTimer);
        monitoringTimer = null;
      }
    };
  };

  return {
    addEventListener: (listener: (state: NetInfoState) => void) => {
      listeners.add(listener);
      
      // 如果有当前状态，立即通知
      if (currentState.isConnected !== null) {
        setTimeout(() => listener(currentState), 0);
      }
      
      // 开始监控（如果还没开始）
      const stopMonitoring = startNetworkMonitoring();
      
      return () => {
        listeners.delete(listener);
        
        // 如果没有监听器了，停止监控
        if (listeners.size === 0) {
          stopMonitoring();
        }
      };
    },
    
    fetch: async () => {
      const state = await performNetworkCheck();
      currentState = state;
      return state;
    }
  };
}

const NetInfo = createNetInfoService();

export interface NetworkInfo {
  isConnected: boolean;
  type: string;
  strength?: number;
}

export class NetworkManager {
  private static instance: NetworkManager;
  private listeners: ((info: NetworkInfo) => void)[] = [];
  private currentStatus: NetworkInfo = {
    isConnected: true,
    type: 'unknown'
  };

  private constructor() {
    this.initialize();
  }

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  private async initialize(): Promise<void> {
    try {
      // 监听网络状态变化
      NetInfo.addEventListener((state: NetInfoState) => {
        const networkInfo: NetworkInfo = {
          isConnected: state.isConnected ?? false,
          type: state.type || 'unknown',
          strength: state.details?.strength
        };

        this.currentStatus = networkInfo;
        this.notifyListeners(networkInfo);
      });

      // 获取初始网络状态
      const state = await NetInfo.fetch();
      this.currentStatus = {
        isConnected: state.isConnected ?? false,
        type: state.type || 'unknown',
        strength: state.details?.strength
      };

      console.log('NetworkManager initialized:', this.currentStatus);
    } catch (error) {
      console.error('NetworkManager initialization failed:', error);
    }
  }

  public getCurrentStatus(): NetworkInfo {
    return this.currentStatus;
  }

  public isConnected(): boolean {
    return this.currentStatus.isConnected;
  }

  public addListener(callback: (info: NetworkInfo) => void): () => void {
    this.listeners.push(callback);
    
    // 立即调用一次回调，传递当前状态
    callback(this.currentStatus);
    
    // 返回取消监听的函数
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(info: NetworkInfo): void {
    this.listeners.forEach(listener => {
      try {
        listener(info);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  public async checkConnectivity(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isConnected ?? false;
    } catch (error) {
      console.error('Failed to check connectivity:', error);
      return false;
    }
  }

  public getNetworkType(): string {
    return this.currentStatus.type;
  }

  public isWifi(): boolean {
    return this.currentStatus.type === 'wifi';
  }

  public isCellular(): boolean {
    return this.currentStatus.type === 'cellular';
  }

  public getSignalStrength(): number | undefined {
    return this.currentStatus.strength;
  }
}