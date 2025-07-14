# 小象聊天后端服务

企业级即时通讯工具的后端服务，基于Node.js和Express构建。

## 功能特性

- JWT认证和授权
- 用户注册和登录
- Token刷新机制
- SQLite数据库存储
- 速率限制和安全防护
- 完整的错误处理
- 请求日志记录

## 技术栈

- Node.js 16+
- Express.js
- SQLite3
- JWT (jsonwebtoken)
- Bcrypt (密码加密)
- Winston (日志)
- Helmet (安全)
- CORS (跨域)

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

### 3. 启动服务器

开发模式（使用nodemon）：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

服务器将在 http://localhost:3000 启动

## API文档

### 认证接口

#### 登录
- **POST** `/api/auth/login`
- **Body**: 
  ```json
  {
    "email": "demo@xiaoxiang.com",
    "password": "demo123"
  }
  ```

#### 注册
- **POST** `/api/auth/register`
- **Body**: 
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "用户名",
    "department": "部门",
    "position": "职位",
    "phone": "13800138000"
  }
  ```

#### 刷新Token
- **POST** `/api/auth/refresh`
- **Body**: 
  ```json
  {
    "refreshToken": "your-refresh-token"
  }
  ```

#### 登出
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <access-token>`
- **Body**: 
  ```json
  {
    "deviceId": "device-id"
  }
  ```

#### 获取当前用户
- **GET** `/api/auth/me`
- **Headers**: `Authorization: Bearer <access-token>`

### 健康检查
- **GET** `/health`

## 默认测试账号

```
邮箱: demo@xiaoxiang.com
密码: demo123
```

## 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── middlewares/     # 中间件
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── services/        # 业务逻辑
│   ├── utils/           # 工具函数
│   └── index.js         # 入口文件
├── data/                # SQLite数据库文件
├── logs/                # 日志文件
├── .env                 # 环境变量
├── .env.example         # 环境变量示例
├── package.json         # 项目配置
└── README.md            # 项目文档
```

## 安全特性

- 密码使用bcrypt加密存储
- JWT令牌认证
- 速率限制防止暴力破解
- Helmet提供安全头
- CORS配置限制跨域访问
- 输入验证和清理

## 开发注意事项

1. 修改代码后，nodemon会自动重启服务器
2. 日志文件保存在`logs/`目录
3. 数据库文件保存在`data/`目录
4. 生产环境请修改JWT密钥和其他敏感配置

## 后续开发计划

- [ ] WebSocket实时消息
- [ ] 消息存储和同步
- [ ] 文件上传支持
- [ ] 群组聊天功能
- [ ] 推送通知
- [ ] 更多用户管理功能