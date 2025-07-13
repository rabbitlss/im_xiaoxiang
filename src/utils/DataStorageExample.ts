import { dataService } from '@/services';
import { User, Message } from '@/types';

/**
 * 数据存储使用示例
 * 展示如何使用DataService进行各种数据操作
 */
export class DataStorageExample {
  
  /**
   * 初始化数据服务
   */
  static async initializeApp(): Promise<void> {
    try {
      console.log('Initializing app data services...');
      await dataService.initialize();
      console.log('App data services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
    }
  }

  /**
   * 用户登录示例
   */
  static async loginExample(): Promise<User | null> {
    try {
      console.log('Attempting login...');
      const user = await dataService.login('user@example.com', 'password123', true);
      console.log('Login successful:', user);
      return user;
    } catch (error) {
      console.error('Login failed:', error);
      return null;
    }
  }

  /**
   * 发送消息示例
   */
  static async sendMessageExample(): Promise<void> {
    try {
      const currentUser = await dataService.getCurrentUser();
      if (!currentUser) {
        console.log('No current user, cannot send message');
        return;
      }

      const message = await dataService.sendMessage({
        senderId: currentUser.id,
        receiverId: 'user_123',
        content: 'Hello, this is a test message!',
        type: 'text',
        isRead: false
      });

      console.log('Message sent successfully:', message);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  /**
   * 获取聊天列表示例
   */
  static async getChatListExample(): Promise<void> {
    try {
      const chats = await dataService.getChats();
      console.log('Chat list retrieved:', chats);
      
      // 获取第一个聊天的消息
      if (chats.length > 0) {
        const messages = await dataService.getMessages(chats[0].id);
        console.log('Messages in first chat:', messages);
      }
    } catch (error) {
      console.error('Failed to get chat list:', error);
    }
  }

  /**
   * 用户设置示例
   */
  static async userSettingsExample(): Promise<void> {
    try {
      // 获取当前设置
      const settings = await dataService.getUserSettings();
      console.log('Current settings:', settings);

      // 更新设置
      await dataService.updateUserSettings({
        theme: 'dark',
        notifications: false
      });

      // 获取更新后的设置
      const updatedSettings = await dataService.getUserSettings();
      console.log('Updated settings:', updatedSettings);
    } catch (error) {
      console.error('Failed to manage user settings:', error);
    }
  }

  /**
   * 草稿消息示例
   */
  static async draftMessageExample(): Promise<void> {
    try {
      const chatId = 'chat_123';
      
      // 保存草稿
      await dataService.saveDraft(chatId, 'This is a draft message...');
      console.log('Draft saved');

      // 获取草稿
      const draft = await dataService.getDraft(chatId);
      console.log('Retrieved draft:', draft);

      // 清理草稿
      await dataService.clearDraft(chatId);
      console.log('Draft cleared');
    } catch (error) {
      console.error('Failed to manage draft:', error);
    }
  }

  /**
   * 离线支持示例
   */
  static async offlineSupportExample(): Promise<void> {
    try {
      // 模拟网络断开
      await dataService.setNetworkStatus('offline');
      console.log('Network status set to offline');

      // 在离线状态下发送消息（会被添加到离线队列）
      await DataStorageExample.sendMessageExample();

      // 模拟网络恢复
      await dataService.setNetworkStatus('online');
      console.log('Network status set to online, syncing offline data...');
    } catch (error) {
      console.error('Failed to demonstrate offline support:', error);
    }
  }

  /**
   * 数据导出示例
   */
  static async dataExportExample(): Promise<void> {
    try {
      const exportedData = await dataService.exportUserData();
      console.log('Exported user data:', exportedData);
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  }

  /**
   * 健康检查示例
   */
  static async healthCheckExample(): Promise<void> {
    try {
      const healthStatus = await dataService.performHealthCheck();
      console.log('System health status:', healthStatus);
      
      if (!healthStatus.overall) {
        console.warn('Some components are not healthy!');
      } else {
        console.log('All systems are healthy');
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  /**
   * 用户登出示例
   */
  static async logoutExample(): Promise<void> {
    try {
      await dataService.logout();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }

  /**
   * 完整的应用流程示例
   */
  static async fullAppFlowExample(): Promise<void> {
    try {
      console.log('=== Starting Full App Flow Example ===');

      // 1. 初始化应用
      await DataStorageExample.initializeApp();

      // 2. 检查健康状态
      await DataStorageExample.healthCheckExample();

      // 3. 用户登录
      const user = await DataStorageExample.loginExample();
      if (!user) {
        console.log('Login failed, stopping example');
        return;
      }

      // 4. 管理用户设置
      await DataStorageExample.userSettingsExample();

      // 5. 发送消息
      await DataStorageExample.sendMessageExample();

      // 6. 获取聊天列表
      await DataStorageExample.getChatListExample();

      // 7. 草稿消息管理
      await DataStorageExample.draftMessageExample();

      // 8. 离线支持演示
      await DataStorageExample.offlineSupportExample();

      // 9. 数据导出
      await DataStorageExample.dataExportExample();

      // 10. 用户登出
      await DataStorageExample.logoutExample();

      console.log('=== Full App Flow Example Completed ===');
    } catch (error) {
      console.error('Full app flow example failed:', error);
    }
  }
}

// 使用示例的使用方法：
// 
// // 在应用启动时初始化
// await DataStorageExample.initializeApp();
//
// // 运行完整流程演示
// await DataStorageExample.fullAppFlowExample();
//
// // 或者单独运行某个示例
// await DataStorageExample.loginExample();
// await DataStorageExample.sendMessageExample();