import { 
  LoginRequest, 
  LoginResponse, 
  RefreshTokenRequest, 
  LogoutRequest,
  ApiResponse,
  ApiErrorCode,
} from '@/types/api';
import { ApiClient } from './ApiClient';
import { SecureStorageService } from './SecureStorageService';
import { logger } from '@/utils';

// JWT Token信息
export interface JWTTokenInfo {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // 过期时间（秒）
  expiresAt: number; // 过期时间戳
  tokenType: string;
}

// 认证状态
export interface AuthState {
  isAuthenticated: boolean;
  user: any | null;
  tokenInfo: JWTTokenInfo | null;
  lastRefreshTime: number;
}

// 认证事件类型
export enum AuthEvent {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  TOKEN_REFRESHED = 'token_refreshed',
  TOKEN_REFRESH_FAILED = 'token_refresh_failed',
  AUTHENTICATION_REQUIRED = 'authentication_required',
}

// 事件监听器类型
export type AuthEventListener = (event: AuthEvent, data?: any) => void;

export class JWTAuthService {
  private static instance: JWTAuthService;
  private apiClient: ApiClient;
  private secureStorage: SecureStorageService;
  private authState: AuthState;
  private refreshPromise: Promise<boolean> | null = null;
  private refreshTimer: any = null;
  private eventListeners: Map<AuthEvent, AuthEventListener[]> = new Map();

  private constructor() {
    this.apiClient = new ApiClient();
    this.secureStorage = SecureStorageService.getInstance();
    this.authState = {
      isAuthenticated: false,
      user: null,
      tokenInfo: null,
      lastRefreshTime: 0,
    };

    this.setupApiInterceptors();
  }

  public static getInstance(): JWTAuthService {
    if (!JWTAuthService.instance) {
      JWTAuthService.instance = new JWTAuthService();
    }
    return JWTAuthService.instance;
  }

  // 初始化认证服务
  public async initialize(): Promise<void> {
    try {
      logger.info('JWTAuthService', 'Initializing authentication service');

      // 尝试从安全存储中恢复token
      const tokenInfo = await this.loadTokenFromStorage();
      if (tokenInfo) {
        // 验证token是否有效
        if (this.isTokenValid(tokenInfo)) {
          this.authState.tokenInfo = tokenInfo;
          this.authState.isAuthenticated = true;
          this.scheduleTokenRefresh();
          
          logger.info('JWTAuthService', 'Authentication restored from storage');
        } else {
          // Token过期，尝试刷新
          logger.info('JWTAuthService', 'Token expired, attempting refresh');
          await this.refreshTokenSilently();
        }
      }
    } catch (error) {
      logger.error('JWTAuthService', 'Failed to initialize authentication', error);
      await this.clearAuthState();
    }
  }

  // 用户登录
  public async login(request: LoginRequest): Promise<LoginResponse> {
    try {
      logger.info('JWTAuthService', 'Attempting user login', { email: request.email });

      // 验证输入参数
      this.validateLoginRequest(request);

      // 发送登录请求
      const response = await this.apiClient.post<LoginResponse>('/auth/login', request);
      
      if (!response.success || !response.data) {
        throw new Error('Login response is invalid');
      }

      const loginData = response.data;

      // 创建token信息
      const tokenInfo: JWTTokenInfo = {
        accessToken: loginData.accessToken,
        refreshToken: loginData.refreshToken,
        expiresIn: loginData.expiresIn,
        expiresAt: Date.now() + (loginData.expiresIn * 1000),
        tokenType: 'Bearer',
      };

      // 更新认证状态
      this.authState = {
        isAuthenticated: true,
        user: loginData.user,
        tokenInfo,
        lastRefreshTime: Date.now(),
      };

      // 保存到安全存储
      await this.saveTokenToStorage(tokenInfo);
      
      // 调度token刷新
      this.scheduleTokenRefresh();

      logger.info('JWTAuthService', 'Login successful', { userId: loginData.user.id });
      this.emitEvent(AuthEvent.LOGIN_SUCCESS, loginData);

      return loginData;
    } catch (error) {
      logger.error('JWTAuthService', 'Login failed', error);
      this.emitEvent(AuthEvent.LOGIN_FAILED, error);
      throw error;
    }
  }

  // 用户登出
  public async logout(deviceId?: string): Promise<void> {
    try {
      logger.info('JWTAuthService', 'User logout initiated');

      // 如果有有效token，通知服务器
      if (this.authState.isAuthenticated && this.authState.tokenInfo) {
        try {
          const request: LogoutRequest = { 
            deviceId: deviceId || await this.getDeviceId() 
          };
          await this.apiClient.post('/auth/logout', request);
        } catch (error) {
          // 登出API失败不应该阻止本地清理
          logger.warn('JWTAuthService', 'Logout API failed, continuing local cleanup', error);
        }
      }

      // 清理本地状态
      await this.clearAuthState();
      
      logger.info('JWTAuthService', 'Logout completed');
      this.emitEvent(AuthEvent.LOGOUT);
    } catch (error) {
      logger.error('JWTAuthService', 'Logout failed', error);
      throw error;
    }
  }

  // 刷新Token
  public async refreshToken(): Promise<boolean> {
    // 如果已经有刷新请求在进行中，等待它完成
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  // 执行实际的token刷新
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const currentTokenInfo = this.authState.tokenInfo;
      if (!currentTokenInfo?.refreshToken) {
        logger.warn('JWTAuthService', 'No refresh token available');
        return false;
      }

      logger.info('JWTAuthService', 'Refreshing access token');

      const request: RefreshTokenRequest = {
        refreshToken: currentTokenInfo.refreshToken,
      };

      const response = await this.apiClient.post<LoginResponse>('/auth/refresh', request);
      
      if (!response.success || !response.data) {
        throw new Error('Token refresh response is invalid');
      }

      const refreshData = response.data;

      // 更新token信息
      const newTokenInfo: JWTTokenInfo = {
        accessToken: refreshData.accessToken,
        refreshToken: refreshData.refreshToken,
        expiresIn: refreshData.expiresIn,
        expiresAt: Date.now() + (refreshData.expiresIn * 1000),
        tokenType: 'Bearer',
      };

      this.authState.tokenInfo = newTokenInfo;
      this.authState.user = refreshData.user;
      this.authState.lastRefreshTime = Date.now();

      // 保存到安全存储
      await this.saveTokenToStorage(newTokenInfo);
      
      // 重新调度刷新
      this.scheduleTokenRefresh();

      logger.info('JWTAuthService', 'Token refreshed successfully');
      this.emitEvent(AuthEvent.TOKEN_REFRESHED, refreshData);

      return true;
    } catch (error) {
      logger.error('JWTAuthService', 'Token refresh failed', error);
      
      // 如果是认证错误，清理状态
      if (this.isAuthError(error)) {
        await this.clearAuthState();
        this.emitEvent(AuthEvent.AUTHENTICATION_REQUIRED);
      } else {
        this.emitEvent(AuthEvent.TOKEN_REFRESH_FAILED, error);
      }

      return false;
    }
  }

  // 静默刷新token
  private async refreshTokenSilently(): Promise<void> {
    try {
      await this.refreshToken();
    } catch (error) {
      // 静默刷新失败，清理状态
      logger.warn('JWTAuthService', 'Silent token refresh failed', error);
      await this.clearAuthState();
    }
  }

  // 获取当前认证状态
  public getAuthState(): AuthState {
    return { ...this.authState };
  }

  // 检查是否已认证
  public isAuthenticated(): boolean {
    return this.authState.isAuthenticated && this.isCurrentTokenValid();
  }

  // 获取访问Token
  public getAccessToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    return this.authState.tokenInfo?.accessToken || null;
  }

  // 获取当前用户信息
  public getCurrentUser(): any | null {
    return this.authState.user;
  }

  // 检查当前token是否有效
  private isCurrentTokenValid(): boolean {
    const tokenInfo = this.authState.tokenInfo;
    return tokenInfo ? this.isTokenValid(tokenInfo) : false;
  }

  // 检查token是否有效
  private isTokenValid(tokenInfo: JWTTokenInfo): boolean {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5分钟缓冲时间
    return tokenInfo.expiresAt > (now + bufferTime);
  }

  // 调度token刷新
  private scheduleTokenRefresh(): void {
    // 清除现有定时器
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    const tokenInfo = this.authState.tokenInfo;
    if (!tokenInfo) {
      return;
    }

    // 在token过期前10分钟刷新
    const refreshTime = tokenInfo.expiresAt - Date.now() - (10 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(() => {
        this.refreshTokenSilently();
      }, refreshTime);

      logger.debug('JWTAuthService', 'Token refresh scheduled', { 
        refreshInMs: refreshTime,
        expiresAt: new Date(tokenInfo.expiresAt).toISOString(),
      });
    } else {
      // 如果token很快就要过期，立即刷新
      this.refreshTokenSilently();
    }
  }

  // 设置API拦截器
  private setupApiInterceptors(): void {
    // 请求拦截器：添加认证头
    this.apiClient.addRequestInterceptor(async (config) => {
      const token = this.getAccessToken();
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    });

    // 错误拦截器：处理认证错误
    this.apiClient.addErrorInterceptor(async (error) => {
      if (this.isAuthError(error)) {
        // 尝试刷新token
        const refreshed = await this.refreshToken();
        if (!refreshed) {
          await this.clearAuthState();
          this.emitEvent(AuthEvent.AUTHENTICATION_REQUIRED);
        }
      }
      return error;
    });
  }

  // 判断是否为认证错误
  private isAuthError(error: any): boolean {
    return error.code === ApiErrorCode.UNAUTHORIZED || 
           error.code === ApiErrorCode.TOKEN_EXPIRED;
  }

  // 验证登录请求参数
  private validateLoginRequest(request: LoginRequest): void {
    if (!request.email || !request.password) {
      throw new Error('Email and password are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(request.email)) {
      throw new Error('Invalid email format');
    }

    if (request.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }
  }

  // 保存token到安全存储
  private async saveTokenToStorage(tokenInfo: JWTTokenInfo): Promise<void> {
    try {
      await this.secureStorage.saveAuthTokens({
        accessToken: tokenInfo.accessToken,
        refreshToken: tokenInfo.refreshToken,
        expiresAt: tokenInfo.expiresAt,
      });
    } catch (error) {
      logger.error('JWTAuthService', 'Failed to save token to storage', error);
      throw error;
    }
  }

  // 从安全存储加载token
  private async loadTokenFromStorage(): Promise<JWTTokenInfo | null> {
    try {
      const authTokens = await this.secureStorage.getAuthTokens();
      if (!authTokens) {
        return null;
      }

      return {
        accessToken: authTokens.accessToken,
        refreshToken: authTokens.refreshToken,
        expiresIn: Math.floor((authTokens.expiresAt - Date.now()) / 1000),
        expiresAt: authTokens.expiresAt,
        tokenType: 'Bearer',
      };
    } catch (error) {
      logger.error('JWTAuthService', 'Failed to load token from storage', error);
      return null;
    }
  }

  // 清理认证状态
  private async clearAuthState(): Promise<void> {
    try {
      // 清除定时器
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }

      // 重置状态
      this.authState = {
        isAuthenticated: false,
        user: null,
        tokenInfo: null,
        lastRefreshTime: 0,
      };

      // 清理安全存储
      await this.secureStorage.clearAuthTokens();

      logger.info('JWTAuthService', 'Auth state cleared');
    } catch (error) {
      logger.error('JWTAuthService', 'Failed to clear auth state', error);
    }
  }

  // 获取设备ID
  private async getDeviceId(): Promise<string> {
    let deviceId = await this.secureStorage.getDeviceId();
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      await this.secureStorage.setDeviceId(deviceId);
    }
    return deviceId;
  }

  // 生成设备ID
  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 事件监听
  public addEventListener(event: AuthEvent, listener: AuthEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.push(listener);

    // 返回取消监听的函数
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // 触发事件
  private emitEvent(event: AuthEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          logger.error('JWTAuthService', 'Event listener error', { event, error });
        }
      });
    }
  }

  // 获取token剩余有效时间（秒）
  public getTokenRemainingTime(): number {
    const tokenInfo = this.authState.tokenInfo;
    if (!tokenInfo) {
      return 0;
    }
    return Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000));
  }

  // 强制刷新token
  public async forceRefreshToken(): Promise<boolean> {
    // 清除现有的刷新Promise，强制创建新的
    this.refreshPromise = null;
    return this.refreshToken();
  }

  // 销毁服务
  public destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    
    this.refreshPromise = null;
    this.eventListeners.clear();
    
    logger.info('JWTAuthService', 'Service destroyed');
  }
}

// 创建默认实例
export const jwtAuthService = JWTAuthService.getInstance();