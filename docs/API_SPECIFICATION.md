# 小象聊天 API 接口规范

## 概述

基于RESTful设计原则的生产级API接口规范，支持JWT认证、离线优先架构。

## 基础信息

- **API版本**: v1
- **基础URL**: `https://api.xiaoxiang.com/v1`
- **认证方式**: JWT Bearer Token
- **数据格式**: JSON
- **字符编码**: UTF-8

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {}, // 响应数据
  "meta": {   // 元数据（可选）
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "hasNext": true
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ],
    "requestId": "req_1234567890",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## 错误代码定义

| 错误代码 | HTTP状态码 | 描述 |
|---------|-----------|------|
| `INVALID_REQUEST` | 400 | 请求格式错误 |
| `VALIDATION_ERROR` | 400 | 参数验证失败 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `TOKEN_EXPIRED` | 401 | Token已过期 |
| `FORBIDDEN` | 403 | 禁止访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMITED` | 429 | 请求频率限制 |
| `SERVER_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |

## 认证接口

### 1. 用户登录
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "deviceId": "device_uuid",
  "deviceInfo": {
    "platform": "ios",
    "version": "14.0",
    "model": "iPhone12"
  }
}
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here",
    "expiresIn": 3600,
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "张三",
      "avatar": "https://cdn.example.com/avatar.jpg",
      "department": "技术部",
      "position": "软件工程师",
      "permissions": ["chat.read", "chat.write", "contacts.read"]
    }
  }
}
```

### 2. 刷新Token
```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh_token_here"
}
```

### 3. 退出登录
```http
POST /auth/logout
Authorization: Bearer {access_token}

{
  "deviceId": "device_uuid"
}
```

## 用户管理接口

### 1. 获取当前用户信息
```http
GET /users/me
Authorization: Bearer {access_token}
```

### 2. 更新用户信息
```http
PUT /users/me
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "李四",
  "avatar": "https://cdn.example.com/new_avatar.jpg",
  "status": "online"
}
```

### 3. 搜索用户
```http
GET /users/search?q={keyword}&limit=20&offset=0
Authorization: Bearer {access_token}
```

## 消息接口

### 1. 发送消息
```http
POST /messages
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "chatId": "chat_123",
  "type": "text",
  "content": "Hello World",
  "replyTo": "msg_456", // 可选，回复消息ID
  "metadata": {         // 可选，额外元数据
    "clientId": "client_generated_id",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "id": "msg_789",
    "chatId": "chat_123",
    "senderId": "user_123",
    "type": "text",
    "content": "Hello World",
    "timestamp": "2024-01-15T10:30:00Z",
    "status": "sent",
    "readBy": []
  }
}
```

### 2. 获取消息列表
```http
GET /messages?chatId={chatId}&limit=20&before={messageId}&after={messageId}
Authorization: Bearer {access_token}
```

### 3. 标记消息已读
```http
PUT /messages/{messageId}/read
Authorization: Bearer {access_token}
```

### 4. 批量标记已读
```http
PUT /messages/read
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "messageIds": ["msg_1", "msg_2", "msg_3"]
}
```

## 聊天会话接口

### 1. 获取聊天列表
```http
GET /chats?limit=20&offset=0&type=all
Authorization: Bearer {access_token}
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "id": "chat_123",
        "type": "private",
        "name": "与李四的对话",
        "avatar": "https://cdn.example.com/avatar.jpg",
        "participants": [
          {
            "id": "user_123",
            "name": "张三",
            "status": "online"
          }
        ],
        "lastMessage": {
          "id": "msg_789",
          "senderId": "user_456",
          "content": "最新消息内容",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        "unreadCount": 3,
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ]
  },
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 50,
      "hasNext": true
    }
  }
}
```

### 2. 创建聊天会话
```http
POST /chats
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "type": "private",
  "participantIds": ["user_456"],
  "name": "项目讨论组" // 群聊时必填
}
```

### 3. 获取聊天详情
```http
GET /chats/{chatId}
Authorization: Bearer {access_token}
```

## 通讯录接口

### 1. 获取组织架构
```http
GET /organization/departments
Authorization: Bearer {access_token}
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "dept_001",
        "name": "技术部",
        "parentId": null,
        "level": 1,
        "children": [
          {
            "id": "dept_002",
            "name": "前端组",
            "parentId": "dept_001",
            "level": 2,
            "memberCount": 5
          }
        ],
        "members": [
          {
            "id": "user_123",
            "name": "张三",
            "position": "技术总监",
            "avatar": "https://cdn.example.com/avatar.jpg",
            "status": "online"
          }
        ]
      }
    ]
  }
}
```

### 2. 获取部门成员
```http
GET /organization/departments/{departmentId}/members?limit=50&offset=0
Authorization: Bearer {access_token}
```

## 文件管理接口

### 1. 上传文件
```http
POST /files/upload
Authorization: Bearer {access_token}
Content-Type: multipart/form-data

file: [binary_data]
type: "image" | "document" | "audio" | "video"
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "id": "file_123",
    "name": "image.jpg",
    "size": 1024000,
    "type": "image",
    "mimeType": "image/jpeg",
    "url": "https://cdn.example.com/files/file_123.jpg",
    "thumbnailUrl": "https://cdn.example.com/thumbnails/file_123_thumb.jpg",
    "uploadedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. 获取文件信息
```http
GET /files/{fileId}
Authorization: Bearer {access_token}
```

## 实时通信接口 (WebSocket)

### 连接建立
```
WSS /ws?token={access_token}&deviceId={device_id}
```

### 消息格式
```json
{
  "type": "message",
  "event": "new_message",
  "data": {
    "id": "msg_123",
    "chatId": "chat_456",
    "senderId": "user_789",
    "content": "Hello",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "requestId": "req_123" // 客户端生成，用于请求响应匹配
}
```

### 事件类型
- `new_message` - 新消息
- `message_read` - 消息已读
- `user_status` - 用户状态变更
- `typing` - 正在输入
- `heartbeat` - 心跳检测

## 数据同步接口

### 1. 获取增量更新
```http
GET /sync/changes?since={timestamp}&types=messages,chats,users
Authorization: Bearer {access_token}
```

### 2. 批量上传本地更改
```http
POST /sync/upload
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "changes": [
    {
      "type": "message",
      "action": "create",
      "data": {...},
      "clientId": "local_id_123",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "deviceId": "device_uuid"
}
```

## 健康检查接口

### 1. 服务状态检查
```http
GET /health
```

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "websocket": "healthy"
  }
}
```

## 请求限制

| 接口类型 | 限制规则 |
|---------|---------|
| 认证接口 | 5次/分钟 |
| 消息发送 | 100次/分钟 |
| 文件上传 | 10次/分钟 |
| 查询接口 | 1000次/分钟 |

## 安全要求

1. **HTTPS强制**: 所有API必须使用HTTPS
2. **Token安全**: JWT Token包含过期时间，建议1小时过期
3. **输入验证**: 所有输入参数必须经过严格验证
4. **SQL注入防护**: 使用参数化查询
5. **XSS防护**: 输出内容进行HTML转义
6. **CORS配置**: 严格配置跨域访问策略