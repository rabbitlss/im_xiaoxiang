import * as SecureStore from 'expo-secure-store';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserCredentials {
  email: string;
  rememberMe: boolean;
}

export class SecureStorageService {
  private static instance: SecureStorageService;

  private constructor() {}

  public static getInstance(): SecureStorageService {
    if (!SecureStorageService.instance) {
      SecureStorageService.instance = new SecureStorageService();
    }
    return SecureStorageService.instance;
  }

  // 通用安全存储方法
  private async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Error saving secure item ${key}:`, error);
      throw error;
    }
  }

  private async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Error reading secure item ${key}:`, error);
      return null;
    }
  }

  private async deleteSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Error deleting secure item ${key}:`, error);
      throw error;
    }
  }

  // 认证Token管理
  public async saveAuthTokens(tokens: AuthTokens): Promise<void> {
    try {
      const tokenData = JSON.stringify(tokens);
      await this.setSecureItem('auth_tokens', tokenData);
      console.log('Auth tokens saved successfully');
    } catch (error) {
      console.error('Error saving auth tokens:', error);
      throw error;
    }
  }

  public async getAuthTokens(): Promise<AuthTokens | null> {
    try {
      const tokenData = await this.getSecureItem('auth_tokens');
      if (tokenData) {
        const tokens: AuthTokens = JSON.parse(tokenData);
        
        // 检查token是否过期
        if (tokens.expiresAt > Date.now()) {
          return tokens;
        } else {
          console.log('Auth tokens expired, removing...');
          await this.clearAuthTokens();
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting auth tokens:', error);
      return null;
    }
  }

  public async clearAuthTokens(): Promise<void> {
    try {
      await this.deleteSecureItem('auth_tokens');
      console.log('Auth tokens cleared');
    } catch (error) {
      console.error('Error clearing auth tokens:', error);
      throw error;
    }
  }

  public async isTokenValid(): Promise<boolean> {
    const tokens = await this.getAuthTokens();
    return tokens !== null;
  }

  // 用户凭据管理（用于记住登录）
  public async saveUserCredentials(credentials: UserCredentials): Promise<void> {
    try {
      if (credentials.rememberMe) {
        const credData = JSON.stringify(credentials);
        await this.setSecureItem('user_credentials', credData);
        console.log('User credentials saved');
      }
    } catch (error) {
      console.error('Error saving user credentials:', error);
      throw error;
    }
  }

  public async getUserCredentials(): Promise<UserCredentials | null> {
    try {
      const credData = await this.getSecureItem('user_credentials');
      if (credData) {
        return JSON.parse(credData);
      }
      return null;
    } catch (error) {
      console.error('Error getting user credentials:', error);
      return null;
    }
  }

  public async clearUserCredentials(): Promise<void> {
    try {
      await this.deleteSecureItem('user_credentials');
      console.log('User credentials cleared');
    } catch (error) {
      console.error('Error clearing user credentials:', error);
      throw error;
    }
  }

  // 设备标识符
  public async getDeviceId(): Promise<string | null> {
    return await this.getSecureItem('device_id');
  }

  public async setDeviceId(deviceId: string): Promise<void> {
    await this.setSecureItem('device_id', deviceId);
  }

  // 推送通知Token
  public async getPushToken(): Promise<string | null> {
    return await this.getSecureItem('push_token');
  }

  public async setPushToken(token: string): Promise<void> {
    await this.setSecureItem('push_token', token);
  }

  public async clearPushToken(): Promise<void> {
    await this.deleteSecureItem('push_token');
  }

  // 加密密钥
  public async getEncryptionKey(): Promise<string | null> {
    return await this.getSecureItem('encryption_key');
  }

  public async setEncryptionKey(key: string): Promise<void> {
    await this.setSecureItem('encryption_key', key);
  }

  // 生物识别相关
  public async getBiometricEnabled(): Promise<boolean> {
    const enabled = await this.getSecureItem('biometric_enabled');
    return enabled === 'true';
  }

  public async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setSecureItem('biometric_enabled', enabled.toString());
  }

  // 清理所有安全数据
  public async clearAllSecureData(): Promise<void> {
    try {
      const secureKeys = [
        'auth_tokens',
        'user_credentials', 
        'device_id',
        'push_token',
        'encryption_key',
        'biometric_enabled'
      ];

      for (const key of secureKeys) {
        try {
          await this.deleteSecureItem(key);
        } catch (error) {
          // 忽略不存在的key的错误
          console.log(`Key ${key} not found, skipping`);
        }
      }
      
      console.log('All secure data cleared');
    } catch (error) {
      console.error('Error clearing secure data:', error);
      throw error;
    }
  }

  // 数据备份和恢复
  public async backupSecureData(): Promise<{ [key: string]: string }> {
    try {
      const backup: { [key: string]: string } = {};
      const secureKeys = [
        'auth_tokens',
        'user_credentials',
        'device_id',
        'push_token',
        'biometric_enabled'
      ];

      for (const key of secureKeys) {
        const value = await this.getSecureItem(key);
        if (value) {
          backup[key] = value;
        }
      }

      return backup;
    } catch (error) {
      console.error('Error backing up secure data:', error);
      throw error;
    }
  }

  public async restoreSecureData(backup: { [key: string]: string }): Promise<void> {
    try {
      for (const [key, value] of Object.entries(backup)) {
        await this.setSecureItem(key, value);
      }
      console.log('Secure data restored successfully');
    } catch (error) {
      console.error('Error restoring secure data:', error);
      throw error;
    }
  }

  // 安全检查
  public async performSecurityCheck(): Promise<{
    hasValidTokens: boolean;
    hasCredentials: boolean;
    biometricEnabled: boolean;
    deviceRegistered: boolean;
  }> {
    try {
      const [hasValidTokens, hasCredentials, biometricEnabled, deviceId] = await Promise.all([
        this.isTokenValid(),
        this.getUserCredentials().then(cred => cred !== null),
        this.getBiometricEnabled(),
        this.getDeviceId()
      ]);

      return {
        hasValidTokens,
        hasCredentials,
        biometricEnabled,
        deviceRegistered: deviceId !== null
      };
    } catch (error) {
      console.error('Error performing security check:', error);
      return {
        hasValidTokens: false,
        hasCredentials: false,
        biometricEnabled: false,
        deviceRegistered: false
      };
    }
  }
}