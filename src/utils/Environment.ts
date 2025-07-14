// 环境变量和配置管理

export interface EnvironmentConfig {
  isDev: boolean;
  apiBaseUrl: string;
  wsUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// 安全的环境检测
export function getEnvironmentConfig(): EnvironmentConfig {
  let isDev = false;
  let apiBaseUrl = 'https://api.xiaoxiang.com/v1';
  let wsUrl = 'wss://ws.xiaoxiang.com/ws';
  
  try {
    // 尝试获取Expo配置
    const Constants = (global as any).require?.('expo-constants')?.default;
    if (Constants?.expoConfig?.extra) {
      isDev = Constants.expoConfig.extra.isDev || false;
      apiBaseUrl = Constants.expoConfig.extra.apiBaseUrl || apiBaseUrl;
      wsUrl = Constants.expoConfig.extra.wsUrl || wsUrl;
    }
  } catch {
    // 如果无法获取，使用默认配置
  }

  // 开发环境的默认配置
  if (isDev) {
    apiBaseUrl = 'http://localhost:3000/api/v1';
    wsUrl = 'ws://localhost:3000/ws';
  }

  return {
    isDev,
    apiBaseUrl,
    wsUrl,
    logLevel: isDev ? 'debug' : 'info',
  };
}

// 导出配置实例
export const ENV_CONFIG = getEnvironmentConfig();