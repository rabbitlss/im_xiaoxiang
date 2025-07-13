import { DatabaseService } from './DatabaseService';
import { StorageService, UserSettings, AppConfig } from './StorageService';
import { SecureStorageService, AuthTokens, UserCredentials } from './SecureStorageService';
import { User, Message, Chat } from '@/types';

export class DataService {
  private static instance: DataService;
  private dbService: DatabaseService;
  private storageService: StorageService;
  private secureStorageService: SecureStorageService;
  private isInitialized: boolean = false;

  private constructor() {
    this.dbService = DatabaseService.getInstance();
    this.storageService = StorageService.getInstance();
    this.secureStorageService = SecureStorageService.getInstance();
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // 初始化所有存储服务
  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      console.log('Initializing DataService...');
      
      // 初始化数据库
      await this.dbService.initialize();
      
      // 执行数据清理（可选）
      await this.performMaintenanceTasks();
      
      this.isInitialized = true;
      console.log('DataService initialized successfully');
    } catch (error) {
      console.error('DataService initialization failed:', error);
      throw error;
    }
  }

  // 数据维护任务
  private async performMaintenanceTasks(): Promise<void> {
    try {
      // 清理30天前的旧消息
      await this.dbService.cleanupOldData(30);
      
      // 检查存储使用情况
      const storageInfo = await this.storageService.getStorageInfo();
      console.log(`Storage usage: ${storageInfo.size} bytes, ${storageInfo.keys.length} keys`);
      
      // 如果存储使用超过限制，执行清理
      const config = await this.storageService.getAppConfig();
      if (storageInfo.size > config.cacheMaxSize) {
        console.log('Storage limit exceeded, performing cleanup...');
        // 这里可以实现更精细的清理逻辑
      }
    } catch (error) {
      console.error('Maintenance tasks failed:', error);
    }
  }

  // === 用户认证相关 ===
  
  public async login(email: string, password: string, rememberMe: boolean = false): Promise<User> {
    try {
      // 这里应该调用API进行登录验证
      // 暂时模拟登录成功
      const user: User = {
        id: 'user_' + Date.now(),
        name: '测试用户',
        email: email,
        department: '技术部',
        position: '软件工程师',
        status: 'online'
      };

      // 模拟获取到的tokens
      const tokens: AuthTokens = {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24小时
      };

      // 保存认证信息
      await this.secureStorageService.saveAuthTokens(tokens);
      
      if (rememberMe) {
        await this.secureStorageService.saveUserCredentials({
          email,
          rememberMe: true
        });
      }

      // 保存用户信息
      await this.dbService.saveUser(user);
      await this.storageService.setCurrentUserId(user.id);
      await this.storageService.setLastLoginTime();

      return user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      // 清理所有用户数据
      await Promise.all([
        this.secureStorageService.clearAuthTokens(),
        this.storageService.removeCurrentUserId(),
        this.storageService.clearOfflineMessages()
      ]);
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  public async isLoggedIn(): Promise<boolean> {
    try {
      const [hasValidTokens, currentUserId] = await Promise.all([
        this.secureStorageService.isTokenValid(),
        this.storageService.getCurrentUserId()
      ]);
      
      return hasValidTokens && currentUserId !== null;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  }

  public async getCurrentUser(): Promise<User | null> {
    try {
      const currentUserId = await this.storageService.getCurrentUserId();
      if (!currentUserId) {
        return null;
      }
      
      return await this.dbService.getUser(currentUserId);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  // === 消息相关 ===
  
  public async sendMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> {
    try {
      const newMessage: Message = {
        ...message,
        id: 'msg_' + Date.now(),
        timestamp: new Date(),
        isRead: false
      };

      // 保存到本地数据库
      await this.dbService.saveMessage(newMessage);
      
      // 更新聊天会话
      await this.updateChatLastMessage(message.senderId, newMessage);
      
      // 添加到离线队列（如果网络不可用）
      const networkStatus = await this.storageService.getNetworkStatus();
      if (networkStatus === 'offline') {
        await this.storageService.addOfflineMessage(newMessage);
      }

      return newMessage;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  public async getMessages(chatId: string, page: number = 0, pageSize: number = 20): Promise<Message[]> {
    try {
      const offset = page * pageSize;
      return await this.dbService.getMessages(chatId, pageSize, offset);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  public async markMessageAsRead(messageId: string): Promise<void> {
    try {
      // 这里需要实现标记消息为已读的逻辑
      // 目前DatabaseService还没有这个方法，后续需要添加
      console.log(`Marking message ${messageId} as read`);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // === 聊天会话相关 ===
  
  private async updateChatLastMessage(chatId: string, message: Message): Promise<void> {
    try {
      // 更新或创建聊天会话
      const existingChats = await this.dbService.getChats();
      const existingChat = existingChats.find(chat => chat.id === chatId);
      
      if (existingChat) {
        existingChat.lastMessage = message;
        existingChat.unreadCount += 1;
        await this.dbService.saveChat(existingChat);
      } else {
        // 创建新的聊天会话
        const newChat: Chat = {
          id: chatId,
          type: 'private',
          participants: [],
          lastMessage: message,
          unreadCount: 1
        };
        await this.dbService.saveChat(newChat);
      }
    } catch (error) {
      console.error('Error updating chat last message:', error);
    }
  }

  public async getChats(): Promise<Chat[]> {
    try {
      return await this.dbService.getChats();
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  public async createChat(participants: User[], type: 'private' | 'group' = 'private'): Promise<Chat> {
    try {
      const chatId = 'chat_' + Date.now();
      const chat: Chat = {
        id: chatId,
        type,
        participants,
        unreadCount: 0
      };

      await this.dbService.saveChat(chat);
      return chat;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }

  // === 用户和通讯录相关 ===
  
  public async saveUser(user: User): Promise<void> {
    try {
      await this.dbService.saveUser(user);
    } catch (error) {
      console.error('Error saving user:', error);
      throw error;
    }
  }

  public async getUser(userId: string): Promise<User | null> {
    try {
      return await this.dbService.getUser(userId);
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  // === 设置相关 ===
  
  public async getUserSettings(): Promise<UserSettings> {
    return await this.storageService.getUserSettings();
  }

  public async updateUserSettings(settings: Partial<UserSettings>): Promise<void> {
    await this.storageService.setUserSettings(settings);
  }

  public async getAppConfig(): Promise<AppConfig> {
    return await this.storageService.getAppConfig();
  }

  // === 草稿相关 ===
  
  public async saveDraft(chatId: string, content: string): Promise<void> {
    await this.storageService.setDraftMessage(chatId, content);
  }

  public async getDraft(chatId: string): Promise<string | null> {
    return await this.storageService.getDraftMessage(chatId);
  }

  public async clearDraft(chatId: string): Promise<void> {
    await this.storageService.removeDraftMessage(chatId);
  }

  // === 离线支持 ===
  
  public async syncOfflineData(): Promise<void> {
    try {
      const offlineMessages = await this.storageService.getOfflineMessages();
      
      if (offlineMessages.length > 0) {
        console.log(`Syncing ${offlineMessages.length} offline messages`);
        
        // 这里应该将离线消息发送到服务器
        // 暂时只是清理离线队列
        await this.storageService.clearOfflineMessages();
        
        console.log('Offline data synced successfully');
      }
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  }

  public async setNetworkStatus(status: 'online' | 'offline'): Promise<void> {
    await this.storageService.setNetworkStatus(status);
    
    if (status === 'online') {
      // 网络恢复时自动同步离线数据
      await this.syncOfflineData();
    }
  }

  // === 数据导出和清理 ===
  
  public async exportUserData(): Promise<any> {
    try {
      const [
        chats,
        settings,
        storageInfo,
        securityCheck
      ] = await Promise.all([
        this.getChats(),
        this.getUserSettings(),
        this.storageService.getStorageInfo(),
        this.secureStorageService.performSecurityCheck()
      ]);

      return {
        chats,
        settings,
        storageInfo,
        securityCheck,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  public async clearAllData(): Promise<void> {
    try {
      await Promise.all([
        this.storageService.clearAllData(),
        this.secureStorageService.clearAllSecureData()
        // 注意：这里没有清理数据库，因为可能需要重新初始化
      ]);
      
      console.log('All user data cleared');
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  }

  // === 健康检查 ===
  
  public async performHealthCheck(): Promise<{
    database: boolean;
    storage: boolean;
    security: boolean;
    overall: boolean;
  }> {
    try {
      const [
        dbHealth,
        storageHealth,
        securityHealth
      ] = await Promise.all([
        this.checkDatabaseHealth(),
        this.checkStorageHealth(),
        this.secureStorageService.performSecurityCheck()
      ]);

      const overall = dbHealth && storageHealth && 
                     (securityHealth.hasValidTokens || securityHealth.hasCredentials);

      return {
        database: dbHealth,
        storage: storageHealth,
        security: securityHealth.hasValidTokens,
        overall
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        database: false,
        storage: false,
        security: false,
        overall: false
      };
    }
  }

  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      // 尝试执行一个简单的数据库查询
      await this.dbService.getChats();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async checkStorageHealth(): Promise<boolean> {
    try {
      // 尝试读写存储
      await this.storageService.getAppConfig();
      return true;
    } catch (error) {
      return false;
    }
  }
}