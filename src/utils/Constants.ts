// 应用常量定义
import { ENV_CONFIG } from './Environment';

export const APP_CONFIG = {
  // 应用信息
  APP_NAME: '小象聊天',
  APP_VERSION: '1.0.0',
  
  // API配置
  API_BASE_URL: ENV_CONFIG.apiBaseUrl,
  API_VERSION: 'v1',
  
  // WebSocket配置
  WS_URL: ENV_CONFIG.wsUrl,
  WS_RECONNECT_INTERVAL: 5000, // 5秒
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  
  // 存储配置
  DATABASE_NAME: 'xiaoxiang_chat.db',
  DATABASE_VERSION: 1,
  CACHE_MAX_SIZE: 100 * 1024 * 1024, // 100MB
  MESSAGE_RETENTION_DAYS: 30,
  
  // UI配置
  PAGINATION_SIZE: 20,
  MAX_MESSAGE_LENGTH: 1000,
  IMAGE_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  FILE_MAX_SIZE: 10 * 1024 * 1024, // 10MB
  
  // 动画配置
  ANIMATION_DURATION: 250,
  LOADING_TIMEOUT: 30000, // 30秒
  
  // 颜色主题
  COLORS: {
    primary: '#007AFF',
    secondary: '#5856D6',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    placeholder: '#C7C7CC',
  },
  
  // 深色主题
  DARK_COLORS: {
    primary: '#0A84FF',
    secondary: '#5E5CE6',
    success: '#32D74B',
    warning: '#FF9F0A',
    error: '#FF453A',
    background: '#000000',
    surface: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    placeholder: '#48484A',
  },
};

// 错误代码
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT: 'UNSUPPORTED_FORMAT',
};

// 错误消息
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ERROR_CODES.AUTH_FAILED]: '登录失败，请检查用户名和密码',
  [ERROR_CODES.TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ERROR_CODES.SERVER_ERROR]: '服务器繁忙，请稍后重试',
  [ERROR_CODES.DATABASE_ERROR]: '数据存储失败',
  [ERROR_CODES.VALIDATION_ERROR]: '输入信息有误',
  [ERROR_CODES.FILE_TOO_LARGE]: '文件大小超出限制',
  [ERROR_CODES.UNSUPPORTED_FORMAT]: '不支持的文件格式',
};

// 消息类型
export const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  SYSTEM: 'system',
} as const;

// 用户状态
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  BUSY: 'busy',
  AWAY: 'away',
} as const;

// 聊天类型
export const CHAT_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  USER_SETTINGS: 'user_settings',
  APP_CONFIG: 'app_config',
  CURRENT_USER_ID: 'current_user_id',
  LAST_LOGIN: 'last_login',
  ACTIVE_CHATS: 'active_chats',
  NETWORK_STATUS: 'network_status',
  OFFLINE_MESSAGES: 'offline_messages',
  
  // 安全存储键名
  AUTH_TOKENS: 'auth_tokens',
  USER_CREDENTIALS: 'user_credentials',
  DEVICE_ID: 'device_id',
  PUSH_TOKEN: 'push_token',
  ENCRYPTION_KEY: 'encryption_key',
  BIOMETRIC_ENABLED: 'biometric_enabled',
};

// 屏幕尺寸断点
export const BREAKPOINTS = {
  SMALL: 320,
  MEDIUM: 768,
  LARGE: 1024,
  EXTRA_LARGE: 1200,
};

// 字体大小
export const FONT_SIZES = {
  SMALL: {
    caption: 11,
    body: 13,
    title: 15,
    heading: 17,
    display: 19,
  },
  MEDIUM: {
    caption: 12,
    body: 14,
    title: 16,
    heading: 18,
    display: 20,
  },
  LARGE: {
    caption: 13,
    body: 15,
    title: 17,
    heading: 19,
    display: 21,
  },
};

// 正则表达式
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/.+/,
};

// 开发环境标识
export const IS_DEV = ENV_CONFIG.isDev;

// 平台检测 - 使用条件导入避免编译错误
let Platform: any;
try {
  Platform = (global as any).require?.('react-native')?.Platform;
  if (!Platform) {
    throw new Error('Platform not available');
  }
} catch {
  Platform = { OS: 'web' };
}

export const IS_IOS = Platform.OS === 'ios';
export const IS_ANDROID = Platform.OS === 'android';
export const IS_WEB = Platform.OS === 'web';