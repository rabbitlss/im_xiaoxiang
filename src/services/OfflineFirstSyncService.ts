import {
  SyncChange,
  SyncAction,
  SyncDataType,
  LocalChange,
  SyncConflict,
  ConflictType,
  SyncChangesRequest,
  SyncChangesResponse,
  UploadChangesRequest,
  UploadChangesResponse,
} from '@/types/api';
import { ApiClient } from './ApiClient';
import { DatabaseService } from './DatabaseService';
import { StorageService } from './StorageService';
import { NetworkManager } from '@/utils/NetworkManager';
import { logger } from '@/utils';

// 同步状态
export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number;
  pendingChanges: number;
  conflictCount: number;
  errors: SyncError[];
}

// 同步错误
export interface SyncError {
  id: string;
  type: 'upload' | 'download' | 'conflict';
  message: string;
  timestamp: number;
  data?: any;
}

// 同步配置
export interface SyncConfig {
  batchSize: number;
  syncInterval: number;
  retryAttempts: number;
  retryDelay: number;
  conflictResolution: ConflictResolutionStrategy;
}

export enum ConflictResolutionStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  MANUAL = 'manual',
  MERGE = 'merge',
}

// 同步事件
export enum SyncEvent {
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
  SYNC_FAILED = 'sync_failed',
  CONFLICT_DETECTED = 'conflict_detected',
  DATA_CHANGED = 'data_changed',
  ONLINE_STATUS_CHANGED = 'online_status_changed',
}

export type SyncEventListener = (event: SyncEvent, data?: any) => void;

export class OfflineFirstSyncService {
  private static instance: OfflineFirstSyncService;
  private apiClient: ApiClient;
  private dbService: DatabaseService;
  private storageService: StorageService;
  private networkManager: NetworkManager;
  
  private syncState: SyncState;
  private config: SyncConfig;
  private eventListeners: Map<SyncEvent, SyncEventListener[]> = new Map();
  private syncTimer: any = null;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {
    this.apiClient = new ApiClient();
    this.dbService = DatabaseService.getInstance();
    this.storageService = StorageService.getInstance();
    this.networkManager = NetworkManager.getInstance();

    this.syncState = {
      isOnline: true,
      isSyncing: false,
      lastSyncTime: 0,
      pendingChanges: 0,
      conflictCount: 0,
      errors: [],
    };

    this.config = {
      batchSize: 50,
      syncInterval: 30000, // 30秒
      retryAttempts: 3,
      retryDelay: 5000,
      conflictResolution: ConflictResolutionStrategy.SERVER_WINS,
    };
  }

  public static getInstance(): OfflineFirstSyncService {
    if (!OfflineFirstSyncService.instance) {
      OfflineFirstSyncService.instance = new OfflineFirstSyncService();
    }
    return OfflineFirstSyncService.instance;
  }

  // 初始化同步服务
  public async initialize(): Promise<void> {
    try {
      logger.info('OfflineFirstSyncService', 'Initializing sync service');

      // 监听网络状态变化
      this.networkUnsubscribe = this.networkManager.addListener((networkInfo) => {
        const wasOnline = this.syncState.isOnline;
        this.syncState.isOnline = networkInfo.isConnected;

        if (!wasOnline && networkInfo.isConnected) {
          // 网络恢复，触发同步
          logger.info('OfflineFirstSyncService', 'Network restored, starting sync');
          this.startSync();
        }

        this.emitEvent(SyncEvent.ONLINE_STATUS_CHANGED, { isOnline: networkInfo.isConnected });
      });

      // 加载上次同步时间
      const lastSyncTime = await this.storageService.getItem<number>('last_sync_time') || 0;
      this.syncState.lastSyncTime = lastSyncTime;

      // 统计待同步的更改
      await this.updatePendingChangesCount();

      // 如果在线，开始同步
      if (this.syncState.isOnline) {
        this.startSync();
      }

      // 启动定时同步
      this.startPeriodicSync();

      logger.info('OfflineFirstSyncService', 'Sync service initialized', this.syncState);
    } catch (error) {
      logger.error('OfflineFirstSyncService', 'Failed to initialize sync service', error);
      throw error;
    }
  }

  // 开始同步
  public async startSync(force: boolean = false): Promise<void> {
    if (this.syncState.isSyncing && !force) {
      logger.debug('OfflineFirstSyncService', 'Sync already in progress');
      return;
    }

    if (!this.syncState.isOnline) {
      logger.debug('OfflineFirstSyncService', 'Cannot sync while offline');
      return;
    }

    try {
      this.syncState.isSyncing = true;
      this.emitEvent(SyncEvent.SYNC_STARTED);

      logger.info('OfflineFirstSyncService', 'Starting data synchronization');

      // 1. 上传本地更改
      await this.uploadLocalChanges();

      // 2. 下载服务器更改
      await this.downloadServerChanges();

      // 3. 处理冲突
      await this.resolveConflicts();

      // 4. 更新同步状态
      this.syncState.lastSyncTime = Date.now();
      await this.storageService.setItem('last_sync_time', this.syncState.lastSyncTime);
      await this.updatePendingChangesCount();

      logger.info('OfflineFirstSyncService', 'Synchronization completed successfully');
      this.emitEvent(SyncEvent.SYNC_COMPLETED, { timestamp: this.syncState.lastSyncTime });

    } catch (error) {
      logger.error('OfflineFirstSyncService', 'Synchronization failed', error);
      this.addSyncError('upload', error.message || 'Unknown sync error', error);
      this.emitEvent(SyncEvent.SYNC_FAILED, { error });
    } finally {
      this.syncState.isSyncing = false;
    }
  }

  // 记录本地更改
  public async recordLocalChange(
    type: SyncDataType,
    action: SyncAction,
    data: any,
    id?: string
  ): Promise<string> {
    try {
      const clientId = id || this.generateClientId();
      
      const localChange: LocalChange = {
        type,
        action,
        data,
        clientId,
        timestamp: new Date().toISOString(),
      };

      // 保存到本地数据库
      await this.saveLocalChange(localChange);

      // 更新待同步计数
      await this.updatePendingChangesCount();

      logger.debug('OfflineFirstSyncService', 'Local change recorded', { type, action, clientId });

      // 如果在线，尝试立即同步
      if (this.syncState.isOnline && !this.syncState.isSyncing) {
        // 延迟一点时间，避免频繁同步
        setTimeout(() => this.startSync(), 1000);
      }

      return clientId;
    } catch (error) {
      logger.error('OfflineFirstSyncService', 'Failed to record local change', error);
      throw error;
    }
  }

  // 上传本地更改
  private async uploadLocalChanges(): Promise<void> {
    try {
      const localChanges = await this.getLocalChanges();
      if (localChanges.length === 0) {
        logger.debug('OfflineFirstSyncService', 'No local changes to upload');
        return;
      }

      logger.info('OfflineFirstSyncService', `Uploading ${localChanges.length} local changes`);

      // 分批上传
      const batches = this.chunkArray(localChanges, this.config.batchSize);
      
      for (const batch of batches) {
        await this.uploadBatch(batch);
      }

      logger.info('OfflineFirstSyncService', 'All local changes uploaded successfully');
    } catch (error) {
      logger.error('OfflineFirstSyncService', 'Failed to upload local changes', error);
      throw error;
    }
  }

  // 上传一批更改
  private async uploadBatch(changes: LocalChange[]): Promise<void> {
    let attempt = 0;
    
    while (attempt < this.config.retryAttempts) {
      try {
        const request: UploadChangesRequest = {
          changes,
          deviceId: await this.getDeviceId(),
        };

        const response = await this.apiClient.post<UploadChangesResponse>('/sync/upload', request);
        
        if (response.success && response.data) {
          const { conflicts, processed } = response.data;

          // 处理冲突
          if (conflicts.length > 0) {
            await this.handleUploadConflicts(conflicts);
          }

          // 删除已处理的本地更改
          await this.removeProcessedChanges(processed);

          logger.debug('OfflineFirstSyncService', `Batch uploaded: ${processed.length} processed, ${conflicts.length} conflicts`);
        }

        return; // 成功，退出重试循环
      } catch (error) {
        attempt++;
        
        if (attempt >= this.config.retryAttempts) {
          logger.error('OfflineFirstSyncService', `Upload batch failed after ${attempt} attempts`, error);
          throw error;
        }

        logger.warn('OfflineFirstSyncService', `Upload batch attempt ${attempt} failed, retrying...`, error);
        await this.sleep(this.config.retryDelay * attempt);
      }
    }
  }

  // 下载服务器更改
  private async downloadServerChanges(): Promise<void> {
    try {
      const since = new Date(this.syncState.lastSyncTime).toISOString();
      const types = Object.values(SyncDataType);

      logger.info('OfflineFirstSyncService', `Downloading server changes since ${since}`);

      let hasMore = true;
      let nextToken: string | undefined;

      while (hasMore) {
        const request: SyncChangesRequest = {
          since,
          types,
        };

        const response = await this.apiClient.get<SyncChangesResponse>('/sync/changes', {
          params: { ...request, nextToken }
        });

        if (response.success && response.data) {
          const { changes, hasMore: moreChanges, nextToken: token } = response.data;

          if (changes.length > 0) {
            await this.applyServerChanges(changes);
            logger.debug('OfflineFirstSyncService', `Applied ${changes.length} server changes`);
          }

          hasMore = moreChanges;
          nextToken = token;
        } else {
          break;
        }
      }

      logger.info('OfflineFirstSyncService', 'Server changes downloaded successfully');
    } catch (error) {
      logger.error('OfflineFirstSyncService', 'Failed to download server changes', error);
      throw error;
    }
  }

  // 应用服务器更改
  private async applyServerChanges(changes: SyncChange[]): Promise<void> {
    for (const change of changes) {
      try {
        await this.applyServerChange(change);
        this.emitEvent(SyncEvent.DATA_CHANGED, { change, source: 'server' });
      } catch (error) {
        logger.error('OfflineFirstSyncService', 'Failed to apply server change', { change, error });
        this.addSyncError('download', `Failed to apply change: ${error.message}`, { change, error });
      }
    }
  }

  // 应用单个服务器更改
  private async applyServerChange(change: SyncChange): Promise<void> {
    const { type, action, data, id } = change;

    switch (type) {
      case SyncDataType.MESSAGES:
        await this.applyMessageChange(action, data, id);
        break;
      case SyncDataType.CHATS:
        await this.applyChatChange(action, data, id);
        break;
      case SyncDataType.USERS:
        await this.applyUserChange(action, data, id);
        break;
      case SyncDataType.DEPARTMENTS:
        await this.applyDepartmentChange(action, data, id);
        break;
      default:
        logger.warn('OfflineFirstSyncService', `Unknown change type: ${type}`);
    }
  }

  // 应用消息更改
  private async applyMessageChange(action: SyncAction, data: any, id: string): Promise<void> {
    switch (action) {
      case SyncAction.CREATE:
      case SyncAction.UPDATE:
        await this.dbService.saveMessage(data);
        break;
      case SyncAction.DELETE:
        // 实现消息删除逻辑
        logger.debug('OfflineFirstSyncService', `Delete message: ${id}`);
        break;
    }
  }

  // 应用聊天更改
  private async applyChatChange(action: SyncAction, data: any, id: string): Promise<void> {
    switch (action) {
      case SyncAction.CREATE:
      case SyncAction.UPDATE:
        await this.dbService.saveChat(data);
        break;
      case SyncAction.DELETE:
        // 实现聊天删除逻辑
        logger.debug('OfflineFirstSyncService', `Delete chat: ${id}`);
        break;
    }
  }

  // 应用用户更改
  private async applyUserChange(action: SyncAction, data: any, id: string): Promise<void> {
    switch (action) {
      case SyncAction.CREATE:
      case SyncAction.UPDATE:
        await this.dbService.saveUser(data);
        break;
      case SyncAction.DELETE:
        // 实现用户删除逻辑
        logger.debug('OfflineFirstSyncService', `Delete user: ${id}`);
        break;
    }
  }

  // 应用部门更改
  private async applyDepartmentChange(action: SyncAction, data: any, id: string): Promise<void> {
    // 实现部门更改逻辑
    logger.debug('OfflineFirstSyncService', `Apply department change: ${action} ${id}`);
  }

  // 处理上传冲突
  private async handleUploadConflicts(conflicts: SyncConflict[]): Promise<void> {
    for (const conflict of conflicts) {
      try {
        await this.resolveConflict(conflict);
      } catch (error) {
        logger.error('OfflineFirstSyncService', 'Failed to resolve conflict', { conflict, error });
        this.addSyncError('conflict', `Conflict resolution failed: ${error.message}`, conflict);
      }
    }
  }

  // 解决冲突
  private async resolveConflict(conflict: SyncConflict): Promise<void> {
    const { clientId, type, serverData, localData } = conflict;

    logger.info('OfflineFirstSyncService', 'Resolving conflict', { clientId, type });

    switch (this.config.conflictResolution) {
      case ConflictResolutionStrategy.SERVER_WINS:
        // 使用服务器数据，丢弃本地更改
        await this.removeLocalChange(clientId);
        break;

      case ConflictResolutionStrategy.CLIENT_WINS:
        // 保持本地更改，忽略服务器数据
        break;

      case ConflictResolutionStrategy.MANUAL:
        // 保存冲突供用户手动解决
        await this.saveConflictForManualResolution(conflict);
        this.syncState.conflictCount++;
        this.emitEvent(SyncEvent.CONFLICT_DETECTED, conflict);
        break;

      case ConflictResolutionStrategy.MERGE:
        // 尝试合并数据
        const mergedData = await this.mergeConflictData(serverData, localData);
        if (mergedData) {
          await this.updateLocalChange(clientId, mergedData);
        } else {
          // 合并失败，降级为手动解决
          await this.saveConflictForManualResolution(conflict);
          this.syncState.conflictCount++;
          this.emitEvent(SyncEvent.CONFLICT_DETECTED, conflict);
        }
        break;
    }
  }

  // 解决冲突
  private async resolveConflicts(): Promise<void> {
    // 获取待解决的冲突
    const conflicts = await this.getUnresolvedConflicts();
    
    if (conflicts.length > 0) {
      logger.info('OfflineFirstSyncService', `Resolving ${conflicts.length} conflicts`);
      
      for (const conflict of conflicts) {
        await this.resolveConflict(conflict);
      }
    }
  }

  // 保存本地更改
  private async saveLocalChange(change: LocalChange): Promise<void> {
    // 实现保存到本地数据库的逻辑
    const changeData = JSON.stringify(change);
    await this.storageService.setItem(`local_change_${change.clientId}`, changeData);
  }

  // 获取本地更改
  private async getLocalChanges(): Promise<LocalChange[]> {
    const storageInfo = await this.storageService.getStorageInfo();
    const changeKeys = storageInfo.keys.filter(key => key.startsWith('local_change_'));
    
    const changes: LocalChange[] = [];
    for (const key of changeKeys) {
      const changeData = await this.storageService.getItem<string>(key);
      if (changeData) {
        try {
          const change = JSON.parse(changeData) as LocalChange;
          changes.push(change);
        } catch (error) {
          logger.warn('OfflineFirstSyncService', `Invalid change data: ${key}`, error);
        }
      }
    }

    return changes.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  // 删除已处理的更改
  private async removeProcessedChanges(clientIds: string[]): Promise<void> {
    for (const clientId of clientIds) {
      await this.removeLocalChange(clientId);
    }
  }

  // 删除本地更改
  private async removeLocalChange(clientId: string): Promise<void> {
    await this.storageService.removeItem(`local_change_${clientId}`);
  }

  // 更新本地更改
  private async updateLocalChange(clientId: string, newData: any): Promise<void> {
    const changeData = await this.storageService.getItem<string>(`local_change_${clientId}`);
    if (changeData) {
      try {
        const change = JSON.parse(changeData) as LocalChange;
        change.data = newData;
        await this.storageService.setItem(`local_change_${clientId}`, JSON.stringify(change));
      } catch (error) {
        logger.error('OfflineFirstSyncService', `Failed to update local change: ${clientId}`, error);
      }
    }
  }

  // 更新待同步更改计数
  private async updatePendingChangesCount(): Promise<void> {
    const changes = await this.getLocalChanges();
    this.syncState.pendingChanges = changes.length;
  }

  // 启动定时同步
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (this.syncState.isOnline && !this.syncState.isSyncing) {
        this.startSync();
      }
    }, this.config.syncInterval);
  }

  // 获取设备ID
  private async getDeviceId(): Promise<string> {
    // 实现获取设备ID的逻辑
    return 'device_id_placeholder';
  }

  // 生成客户端ID
  private generateClientId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // 分块数组
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 延迟函数
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 添加同步错误
  private addSyncError(type: 'upload' | 'download' | 'conflict', message: string, data?: any): void {
    const error: SyncError = {
      id: this.generateClientId(),
      type,
      message,
      timestamp: Date.now(),
      data,
    };

    this.syncState.errors.push(error);
    
    // 只保留最近的50个错误
    if (this.syncState.errors.length > 50) {
      this.syncState.errors = this.syncState.errors.slice(-50);
    }
  }

  // 事件监听
  public addEventListener(event: SyncEvent, listener: SyncEventListener): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    
    const listeners = this.eventListeners.get(event)!;
    listeners.push(listener);

    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // 触发事件
  private emitEvent(event: SyncEvent, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event, data);
        } catch (error) {
          logger.error('OfflineFirstSyncService', 'Event listener error', { event, error });
        }
      });
    }
  }

  // 获取同步状态
  public getSyncState(): SyncState {
    return { ...this.syncState };
  }

  // 更新配置
  public updateConfig(config: Partial<SyncConfig>): void {
    this.config = { ...this.config, ...config };
    
    // 如果更新了同步间隔，重启定时器
    if (config.syncInterval) {
      this.startPeriodicSync();
    }
  }

  // 手动解决冲突
  public async resolveManualConflict(
    conflictId: string, 
    resolution: 'server' | 'client' | 'merged',
    mergedData?: any
  ): Promise<void> {
    // 实现手动冲突解决逻辑
    logger.info('OfflineFirstSyncService', `Manual conflict resolution: ${conflictId} -> ${resolution}`);
    this.syncState.conflictCount = Math.max(0, this.syncState.conflictCount - 1);
  }

  // 清除同步错误
  public clearSyncErrors(): void {
    this.syncState.errors = [];
  }

  // 强制同步
  public async forceSync(): Promise<void> {
    await this.startSync(true);
  }

  // 销毁服务
  public destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.eventListeners.clear();
    logger.info('OfflineFirstSyncService', 'Service destroyed');
  }

  // 以下是一些占位方法，需要根据具体需求实现

  private async saveConflictForManualResolution(conflict: SyncConflict): Promise<void> {
    // 保存冲突到本地存储，供用户手动解决
    await this.storageService.setItem(`conflict_${conflict.clientId}`, conflict);
  }

  private async getUnresolvedConflicts(): Promise<SyncConflict[]> {
    // 获取未解决的冲突
    return [];
  }

  private async mergeConflictData(serverData: any, localData: any): Promise<any | null> {
    // 实现数据合并逻辑
    // 这里需要根据具体的数据类型来实现合并策略
    return null;
  }
}

// 创建默认实例
export const offlineFirstSyncService = OfflineFirstSyncService.getInstance();