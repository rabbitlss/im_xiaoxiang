// 主要数据服务
export { DataService } from './DataService';

// 底层存储服务
export { DatabaseService } from './DatabaseService';
export { StorageService } from './StorageService';  
export { SecureStorageService } from './SecureStorageService';

// 类型定义
export type { UserSettings, AppConfig } from './StorageService';
export type { AuthTokens, UserCredentials } from './SecureStorageService';

// 导入类来创建单例实例
import { DataService } from './DataService';
import { DatabaseService } from './DatabaseService';
import { StorageService } from './StorageService';
import { SecureStorageService } from './SecureStorageService';

// 便捷的单例访问
export const dataService = DataService.getInstance();
export const databaseService = DatabaseService.getInstance();
export const storageService = StorageService.getInstance();
export const secureStorageService = SecureStorageService.getInstance();