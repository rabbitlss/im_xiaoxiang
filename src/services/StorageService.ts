import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'zh' | 'en';
  notifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

export interface AppConfig {
  serverUrl: string;
  apiVersion: string;
  maxMessageLength: number;
  cacheMaxSize: number;
}

export class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // 通用存储方法
  private async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  private async getItem<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue != null) {
        return JSON.parse(jsonValue);
      }
      return defaultValue || null;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue || null;
    }
  }

  private async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key}:`, error);
      throw error;
    }
  }

  // 用户设置
  public async getUserSettings(): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      theme: 'light',
      language: 'zh',
      notifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
      fontSize: 'medium'
    };

    const settings = await this.getItem<UserSettings>('user_settings', defaultSettings);
    return settings || defaultSettings;
  }

  public async setUserSettings(settings: Partial<UserSettings>): Promise<void> {
    const currentSettings = await this.getUserSettings();
    const newSettings = { ...currentSettings, ...settings };
    await this.setItem('user_settings', newSettings);
  }

  // 应用配置
  public async getAppConfig(): Promise<AppConfig> {
    const defaultConfig: AppConfig = {
      serverUrl: 'https://api.xiaoxiang.com',
      apiVersion: 'v1',
      maxMessageLength: 1000,
      cacheMaxSize: 100 * 1024 * 1024 // 100MB
    };

    const config = await this.getItem<AppConfig>('app_config', defaultConfig);
    return config || defaultConfig;
  }

  public async setAppConfig(config: Partial<AppConfig>): Promise<void> {
    const currentConfig = await this.getAppConfig();
    const newConfig = { ...currentConfig, ...config };
    await this.setItem('app_config', newConfig);
  }

  // 用户登录状态
  public async getLastLoginTime(): Promise<string | null> {
    return await this.getItem<string>('last_login');
  }

  public async setLastLoginTime(): Promise<void> {
    await this.setItem('last_login', new Date().toISOString());
  }

  // 缓存用户信息
  public async getCurrentUserId(): Promise<string | null> {
    return await this.getItem<string>('current_user_id');
  }

  public async setCurrentUserId(userId: string): Promise<void> {
    await this.setItem('current_user_id', userId);
  }

  public async removeCurrentUserId(): Promise<void> {
    await this.removeItem('current_user_id');
  }

  // 聊天相关缓存
  public async getActiveChats(): Promise<string[]> {
    return await this.getItem<string[]>('active_chats', []) || [];
  }

  public async setActiveChats(chatIds: string[]): Promise<void> {
    await this.setItem('active_chats', chatIds);
  }

  public async addActiveChat(chatId: string): Promise<void> {
    const activeChats = await this.getActiveChats();
    if (!activeChats.includes(chatId)) {
      activeChats.unshift(chatId);
      // 只保留最近的10个活跃聊天
      const limitedChats = activeChats.slice(0, 10);
      await this.setActiveChats(limitedChats);
    }
  }

  // 草稿消息
  public async getDraftMessage(chatId: string): Promise<string | null> {
    return await this.getItem<string>(`draft_${chatId}`);
  }

  public async setDraftMessage(chatId: string, message: string): Promise<void> {
    if (message.trim()) {
      await this.setItem(`draft_${chatId}`, message);
    } else {
      await this.removeDraftMessage(chatId);
    }
  }

  public async removeDraftMessage(chatId: string): Promise<void> {
    await this.removeItem(`draft_${chatId}`);
  }

  // 网络状态缓存
  public async getNetworkStatus(): Promise<'online' | 'offline'> {
    return await this.getItem<'online' | 'offline'>('network_status', 'online') || 'online';
  }

  public async setNetworkStatus(status: 'online' | 'offline'): Promise<void> {
    await this.setItem('network_status', status);
  }

  // 离线消息队列
  public async getOfflineMessages(): Promise<any[]> {
    return await this.getItem<any[]>('offline_messages', []) || [];
  }

  public async addOfflineMessage(message: any): Promise<void> {
    const offlineMessages = await this.getOfflineMessages();
    offlineMessages.push({
      ...message,
      timestamp: Date.now()
    });
    await this.setItem('offline_messages', offlineMessages);
  }

  public async clearOfflineMessages(): Promise<void> {
    await this.removeItem('offline_messages');
  }

  // 清理所有数据
  public async clearAllData(): Promise<void> {
    try {
      await AsyncStorage.clear();
      console.log('All storage data cleared');
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  }

  // 获取存储使用情况
  public async getStorageInfo(): Promise<{ keys: string[], size: number }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }

      return { keys, size: totalSize };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { keys: [], size: 0 };
    }
  }

  // 批量操作
  public async multiSet(keyValuePairs: [string, any][]): Promise<void> {
    try {
      const pairs: [string, string][] = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify(value)
      ]);
      await AsyncStorage.multiSet(pairs);
    } catch (error) {
      console.error('Error in multiSet:', error);
      throw error;
    }
  }

  public async multiGet(keys: string[]): Promise<{ [key: string]: any }> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: { [key: string]: any } = {};

      keyValuePairs.forEach(([key, value]) => {
        if (value) {
          try {
            result[key] = JSON.parse(value);
          } catch {
            result[key] = value;
          }
        }
      });

      return result;
    } catch (error) {
      console.error('Error in multiGet:', error);
      return {};
    }
  }
}