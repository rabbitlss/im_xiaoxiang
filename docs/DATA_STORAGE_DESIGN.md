# 小象聊天 - 数据存储架构设计

## 存储需求分析

### 1. 数据类型分类

#### 高频读写数据
- **消息记录**: 大量、实时、需要分页查询
- **会话列表**: 频繁更新、需要排序
- **在线状态**: 实时变化、临时存储

#### 中频访问数据  
- **用户信息**: 相对稳定、需要快速查询
- **通讯录**: 树形结构、支持搜索
- **聊天设置**: 个性化配置

#### 低频配置数据
- **应用设置**: 主题、语言、通知等
- **登录凭证**: Token、用户认证信息

## 存储架构设计

### 三层存储架构

```
┌─────────────────────────────────────────┐
│               应用层                      │
├─────────────────────────────────────────┤
│  Level 1: 内存状态管理 (React Context)    │
│  - 当前用户状态                          │
│  - 活跃聊天数据                          │
│  - UI状态                               │
├─────────────────────────────────────────┤
│  Level 2: 本地持久化存储                  │
│  ┌─────────────┬─────────────────────────┤
│  │   SQLite    │     AsyncStorage        │
│  │- 消息历史    │ - 用户设置              │
│  │- 会话数据    │ - 登录Token            │
│  │- 通讯录缓存  │ - 简单配置              │
│  └─────────────┴─────────────────────────┤
├─────────────────────────────────────────┤
│  Level 3: 远程云端存储                    │
│  - 用户账户服务                          │
│  - 消息云端备份                          │
│  - 组织架构数据                          │
│  - 多端同步服务                          │
└─────────────────────────────────────────┘
```

## 技术选型

### 本地存储技术对比

| 技术 | 适用场景 | 优势 | 劣势 |
|------|---------|-----|-----|
| **SQLite** | 消息、会话 | 复杂查询、事务支持、大数据量 | 配置复杂 |
| **AsyncStorage** | 配置、Token | 简单易用、原生支持 | 仅支持字符串、性能一般 |
| **MMKV** | 高频读写 | 高性能、类型安全 | 需要原生模块 |
| **Realm** | 复杂对象 | 对象数据库、跨平台 | 学习成本高 |

### 最终选型

#### SQLite (expo-sqlite) 
**用途**: 消息存储、会话管理、通讯录缓存
```sql
-- 消息表设计
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话表设计  
CREATE TABLE chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL, -- 'private' | 'group'
  name TEXT,
  avatar TEXT,
  last_message_id TEXT,
  unread_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户表设计
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  department TEXT,
  position TEXT,
  status TEXT DEFAULT 'offline'
);
```

#### AsyncStorage (@react-native-async-storage/async-storage)
**用途**: 简单配置、登录状态
```typescript
// 存储结构
interface StorageKeys {
  'user_token': string;
  'user_settings': UserSettings;
  'app_config': AppConfig;
  'last_login': string;
}
```

#### React Context
**用途**: 实时状态管理
```typescript
interface AppState {
  currentUser: User | null;
  activeChats: Chat[];
  onlineUsers: string[];
  networkStatus: 'online' | 'offline';
}
```

## 数据同步策略

### 1. 消息同步
- **实时**: WebSocket推送新消息
- **增量**: 定期拉取未读消息  
- **全量**: 首次登录或数据丢失时

### 2. 离线支持
- **写操作**: 本地队列暂存，网络恢复后同步
- **读操作**: 优先本地数据，后台更新
- **冲突解决**: 服务端时间戳优先

### 3. 缓存策略
- **消息**: 本地保留30天，云端永久存储
- **通讯录**: 每日全量更新，实时增量更新
- **媒体文件**: 本地缓存7天，按需下载

## 性能优化

### 1. 数据库优化
```sql
-- 索引设计
CREATE INDEX idx_messages_chat_timestamp ON messages(chat_id, timestamp);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_chats_updated ON chats(updated_at DESC);
```

### 2. 分页策略
- **消息列表**: 每页20条，向上无限滚动
- **会话列表**: 全量加载，本地排序  
- **通讯录**: 按部门分组，懒加载

### 3. 内存管理
- **消息缓存**: 最多保留5个活跃会话的消息
- **图片缓存**: LRU策略，最大50MB
- **状态清理**: 切换会话时清理无关数据

## 数据安全

### 1. 本地加密
- **敏感数据**: 使用expo-secure-store加密存储
- **消息内容**: 可选择性加密存储
- **用户Token**: 安全存储，自动过期

### 2. 传输安全
- **HTTPS**: 所有API请求使用HTTPS
- **WebSocket**: WSS加密连接
- **Token**: JWT令牌，定期刷新

## 实施计划

### Phase 1: 基础存储
- [x] SQLite数据库初始化
- [x] AsyncStorage配置管理
- [x] Context状态管理

### Phase 2: 数据模型
- [ ] 消息存储模型
- [ ] 用户数据模型  
- [ ] 会话管理模型

### Phase 3: 同步机制
- [ ] WebSocket实时同步
- [ ] 离线队列机制
- [ ] 数据冲突解决

### Phase 4: 性能优化
- [ ] 数据库索引优化
- [ ] 分页加载优化
- [ ] 缓存策略优化