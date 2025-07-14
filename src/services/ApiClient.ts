import {
  ApiResponse,
  ApiError,
  ApiErrorCode,
  RequestOptions,
  HttpMethod,
  RequestConfig,
} from '@/types/api';
import { logger } from '@/utils';
import { ENV_CONFIG } from '@/utils/Environment';

// API客户端配置
export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: any) => boolean;
  onRequest?: (config: RequestOptions) => Promise<RequestOptions>;
  onResponse?: (response: any) => Promise<any>;
  onError?: (error: ApiError) => Promise<void>;
}

// 请求拦截器类型
export type RequestInterceptor = (config: RequestOptions) => Promise<RequestOptions>;
export type ResponseInterceptor = (response: any) => Promise<any>;
export type ErrorInterceptor = (error: ApiError) => Promise<ApiError>;

// 默认配置
const DEFAULT_CONFIG: ApiClientConfig = {
  baseURL: ENV_CONFIG.apiBaseUrl,
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error: any) => {
    // 只对网络错误和5xx错误重试
    return (
      !error.response ||
      (error.response.status >= 500 && error.response.status < 600) ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'TIMEOUT'
    );
  },
};

export class ApiClient {
  private config: ApiClientConfig;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorInterceptors: ErrorInterceptor[] = [];

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // 添加请求拦截器
  public addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // 添加响应拦截器
  public addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // 添加错误拦截器
  public addErrorInterceptor(interceptor: ErrorInterceptor): void {
    this.errorInterceptors.push(interceptor);
  }

  // 发送请求的核心方法
  public async request<T = any>(options: RequestOptions): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let attempt = 0;
    let lastError: any;

    // 合并配置
    const requestConfig: RequestOptions = {
      ...options,
      timeout: options.timeout || this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    while (attempt <= this.config.maxRetries) {
      try {
        // 应用请求拦截器
        let processedConfig = requestConfig;
        for (const interceptor of this.requestInterceptors) {
          processedConfig = await interceptor(processedConfig);
        }

        logger.debug('ApiClient', `Request ${attempt + 1}/${this.config.maxRetries + 1}`, {
          method: processedConfig.method,
          url: processedConfig.url,
          attempt: attempt + 1,
        });

        // 发送HTTP请求
        const response = await this.performRequest(processedConfig);

        // 应用响应拦截器
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        const duration = Date.now() - startTime;
        logger.info('ApiClient', 'Request completed successfully', {
          method: processedConfig.method,
          url: processedConfig.url,
          status: response.status,
          duration,
          attempts: attempt + 1,
        });

        return this.parseResponse<T>(processedResponse);
      } catch (error: any) {
        lastError = error;
        attempt++;

        const duration = Date.now() - startTime;
        logger.warn('ApiClient', `Request attempt ${attempt} failed`, {
          method: requestConfig.method,
          url: requestConfig.url,
          error: error?.message || String(error),
          duration,
        });

        // 检查是否需要重试
        if (attempt <= this.config.maxRetries && this.config.retryCondition(error)) {
          const delay = this.calculateRetryDelay(attempt);
          logger.info('ApiClient', `Retrying in ${delay}ms`, { attempt, delay });
          await this.sleep(delay);
          continue;
        }

        // 不重试或重试次数用尽，抛出错误
        break;
      }
    }

    // 处理最终错误
    const apiError = this.normalizeError(lastError, requestConfig);
    
    // 应用错误拦截器
    let processedError = apiError;
    for (const interceptor of this.errorInterceptors) {
      processedError = await interceptor(processedError);
    }

    // 调用错误处理回调
    if (this.config.onError) {
      await this.config.onError(processedError);
    }

    throw processedError;
  }

  // GET请求
  public async get<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.GET,
      url,
      ...config,
    });
  }

  // POST请求
  public async post<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.POST,
      url,
      data,
      ...config,
    });
  }

  // PUT请求
  public async put<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.PUT,
      url,
      data,
      ...config,
    });
  }

  // DELETE请求
  public async delete<T = any>(url: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.DELETE,
      url,
      ...config,
    });
  }

  // PATCH请求
  public async patch<T = any>(
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>({
      method: HttpMethod.PATCH,
      url,
      data,
      ...config,
    });
  }

  // 执行实际的HTTP请求
  private async performRequest(config: RequestOptions): Promise<any> {
    const { method, url, data, headers, timeout, params } = config;
    const fullUrl = this.buildUrl(url, params);

    // 创建AbortController用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const fetchOptions: RequestInit = {
        method,
        headers: headers as HeadersInit,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      };

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      // 检查响应状态
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      return {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: responseData,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error?.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  // 构建完整URL
  private buildUrl(url: string, params?: Record<string, any>): string {
    const fullUrl = url.startsWith('http') ? url : `${this.config.baseURL}${url}`;
    
    if (!params || Object.keys(params).length === 0) {
      return fullUrl;
    }

    const urlObj = new URL(fullUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });

    return urlObj.toString();
  }

  // 解析API响应
  private parseResponse<T>(response: any): ApiResponse<T> {
    const { data } = response;

    // 检查响应格式
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid response format');
    }

    // 检查业务错误
    if (data.success === false) {
      const apiError: ApiError = {
        code: data.error?.code || ApiErrorCode.SERVER_ERROR,
        message: data.error?.message || 'Unknown error',
        details: data.error?.details || [],
        requestId: data.error?.requestId || this.generateRequestId(),
        timestamp: data.error?.timestamp || new Date().toISOString(),
      };
      throw apiError;
    }

    return data as ApiResponse<T>;
  }

  // 标准化错误
  private normalizeError(error: any, config: RequestOptions): ApiError {
    // 如果已经是标准化的API错误
    if (error.code && error.message) {
      return error as ApiError;
    }

    // 网络错误
    if (error.message === 'Request timeout') {
      return {
        code: ApiErrorCode.TIMEOUT_ERROR,
        message: '请求超时，请检查网络连接',
        details: [],
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
    }

    if (error.message === 'Failed to fetch' || error.code === 'NETWORK_ERROR') {
      return {
        code: ApiErrorCode.NETWORK_ERROR,
        message: '网络连接失败，请检查网络设置',
        details: [],
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
    }

    // HTTP错误
    if (error.message && error.message.startsWith('HTTP ')) {
      const status = parseInt(error.message.match(/HTTP (\\d+)/)?.[1] || '500');
      let code: ApiErrorCode;
      let message: string;

      switch (status) {
        case 400:
          code = ApiErrorCode.INVALID_REQUEST;
          message = '请求格式错误';
          break;
        case 401:
          code = ApiErrorCode.UNAUTHORIZED;
          message = '未授权访问，请重新登录';
          break;
        case 403:
          code = ApiErrorCode.FORBIDDEN;
          message = '禁止访问该资源';
          break;
        case 404:
          code = ApiErrorCode.NOT_FOUND;
          message = '请求的资源不存在';
          break;
        case 429:
          code = ApiErrorCode.RATE_LIMITED;
          message = '请求过于频繁，请稍后重试';
          break;
        case 503:
          code = ApiErrorCode.SERVICE_UNAVAILABLE;
          message = '服务暂时不可用，请稍后重试';
          break;
        default:
          code = ApiErrorCode.SERVER_ERROR;
          message = '服务器内部错误';
      }

      return {
        code,
        message,
        details: [],
        requestId: this.generateRequestId(),
        timestamp: new Date().toISOString(),
      };
    }

    // 默认错误
    return {
      code: ApiErrorCode.SERVER_ERROR,
      message: error.message || '未知错误',
      details: [],
      requestId: this.generateRequestId(),
      timestamp: new Date().toISOString(),
    };
  }

  // 计算重试延迟（指数退避）
  private calculateRetryDelay(attempt: number): number {
    return Math.min(this.config.retryDelay * Math.pow(2, attempt - 1), 30000);
  }

  // 生成请求ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 延迟函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 更新配置
  public updateConfig(config: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // 获取当前配置
  public getConfig(): ApiClientConfig {
    return { ...this.config };
  }
}

// 创建默认的API客户端实例
export const apiClient = new ApiClient();