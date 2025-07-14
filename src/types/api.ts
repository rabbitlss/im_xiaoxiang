// API相关类型定义

// 基础API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: ApiMeta;
  error?: ApiError;
}

export interface ApiMeta {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
  timestamp: string;
  version: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: ApiErrorDetail[];
  requestId: string;
  timestamp: string;
}

export interface ApiErrorDetail {
  field: string;
  message: string;
}

// 错误代码枚举
export enum ApiErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

// 认证相关类型
export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
  deviceInfo: DeviceInfo;
}

export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  version: string;
  model?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  deviceId: string;
}

// 用户相关类型
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  department: string;
  position: string;
  status: UserStatus;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  AWAY = 'away',
}

export interface UpdateUserRequest {
  name?: string;
  avatar?: string;
  status?: UserStatus;
}

export interface SearchUsersRequest {
  q: string;
  limit?: number;
  offset?: number;
}

// 消息相关类型
export interface SendMessageRequest {
  chatId: string;
  type: MessageType;
  content: string;
  replyTo?: string;
  metadata?: MessageMetadata;
}

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
}

export interface MessageMetadata {
  clientId?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface MessageResponse {
  id: string;
  chatId: string;
  senderId: string;
  type: MessageType;
  content: string;
  timestamp: string;
  status: MessageStatus;
  readBy: MessageReadInfo[];
  replyTo?: string;
  metadata?: MessageMetadata;
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export interface MessageReadInfo {
  userId: string;
  readAt: string;
}

export interface GetMessagesRequest {
  chatId: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface MarkMessagesReadRequest {
  messageIds: string[];
}

// 聊天会话相关类型
export interface ChatResponse {
  id: string;
  type: ChatType;
  name?: string;
  avatar?: string;
  participants: ChatParticipant[];
  lastMessage?: MessageResponse;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
}

export interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
  status: UserStatus;
  role?: ChatRole;
  joinedAt: string;
}

export enum ChatRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

export interface CreateChatRequest {
  type: ChatType;
  participantIds: string[];
  name?: string;
}

export interface GetChatsRequest {
  limit?: number;
  offset?: number;
  type?: 'all' | 'private' | 'group';
}

// 组织架构相关类型
export interface DepartmentResponse {
  id: string;
  name: string;
  parentId?: string;
  level: number;
  children?: DepartmentResponse[];
  members?: DepartmentMember[];
  memberCount?: number;
}

export interface DepartmentMember {
  id: string;
  name: string;
  position: string;
  avatar?: string;
  status: UserStatus;
  email: string;
  phone?: string;
}

export interface GetDepartmentMembersRequest {
  departmentId: string;
  limit?: number;
  offset?: number;
}

// 文件管理相关类型
export interface UploadFileRequest {
  file: File | Blob;
  type: FileType;
}

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export interface FileResponse {
  id: string;
  name: string;
  size: number;
  type: FileType;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

// WebSocket相关类型
export interface WebSocketMessage<T = any> {
  type: string;
  event: WebSocketEvent;
  data: T;
  requestId?: string;
}

export enum WebSocketEvent {
  NEW_MESSAGE = 'new_message',
  MESSAGE_READ = 'message_read',
  USER_STATUS = 'user_status',
  TYPING = 'typing',
  HEARTBEAT = 'heartbeat',
  ERROR = 'error',
}

export interface TypingData {
  chatId: string;
  userId: string;
  isTyping: boolean;
}

export interface UserStatusData {
  userId: string;
  status: UserStatus;
  lastSeen?: string;
}

// 数据同步相关类型
export interface SyncChangesRequest {
  since: string;
  types: SyncDataType[];
}

export enum SyncDataType {
  MESSAGES = 'messages',
  CHATS = 'chats',
  USERS = 'users',
  DEPARTMENTS = 'departments',
}

export interface SyncChange {
  type: SyncDataType;
  action: SyncAction;
  data: any;
  id: string;
  timestamp: string;
  version: number;
}

export enum SyncAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}

export interface SyncChangesResponse {
  changes: SyncChange[];
  hasMore: boolean;
  nextToken?: string;
}

export interface UploadChangesRequest {
  changes: LocalChange[];
  deviceId: string;
}

export interface LocalChange {
  type: SyncDataType;
  action: SyncAction;
  data: any;
  clientId: string;
  timestamp: string;
}

export interface UploadChangesResponse {
  conflicts: SyncConflict[];
  processed: string[]; // 成功处理的clientId列表
}

export interface SyncConflict {
  clientId: string;
  type: ConflictType;
  serverData: any;
  localData: any;
}

export enum ConflictType {
  VERSION_CONFLICT = 'version_conflict',
  DELETED_ON_SERVER = 'deleted_on_server',
  PERMISSION_DENIED = 'permission_denied',
}

// 健康检查相关类型
export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
}

// 分页相关类型
export interface PaginationRequest {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 搜索相关类型
export interface SearchRequest {
  q: string;
  type?: SearchType[];
  limit?: number;
  offset?: number;
  filters?: SearchFilter[];
}

export enum SearchType {
  USERS = 'users',
  MESSAGES = 'messages',
  CHATS = 'chats',
  FILES = 'files',
}

export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

export enum FilterOperator {
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  IN = 'in',
  NOT_IN = 'not_in',
}

export interface SearchResponse<T> {
  results: T[];
  total: number;
  took: number; // 搜索耗时(ms)
  highlights?: Record<string, string[]>;
}

// HTTP相关类型
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export interface RequestOptions extends RequestConfig {
  method: HttpMethod;
  url: string;
  data?: any;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

// 缓存相关类型
export interface CacheConfig {
  ttl?: number; // 缓存时间(秒)
  key: string;
  tags?: string[]; // 缓存标签，用于批量清理
}

export interface CacheItem<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}