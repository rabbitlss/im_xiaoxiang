# 小象聊天 - 企业级即时通讯工具

## 项目简介
小象聊天是一款专为企业设计的移动端即时通讯工具，提供高效的团队沟通和协作功能。

## 核心功能 (MVP版本)
- 💬 **消息模块**: 实时聊天、消息列表、多媒体消息
- 📱 **通讯录模块**: 组织架构、员工信息、快速搜索

## 技术栈

### 前端
- **框架**: React Native + Expo
- **语言**: TypeScript
- **导航**: React Navigation 6.x
- **状态管理**: React Context
- **UI组件**: React Native内置组件 + 自定义组件
- **网络请求**: 自定义ApiClient
- **本地存储**: AsyncStorage + SQLite
- **认证**: JWT

### 后端
- **框架**: Node.js + Express
- **数据库**: SQLite3
- **认证**: JWT + Bcrypt
- **日志**: Winston
- **安全**: Helmet + CORS + Rate Limiting

## 项目结构
```
.
├── src/                # 前端源代码
│   ├── components/     # 公共组件
│   ├── screens/        # 页面组件
│   ├── navigation/     # 导航配置
│   ├── types/          # TypeScript类型定义
│   ├── utils/          # 工具函数
│   ├── services/       # API服务
│   └── store/          # 状态管理
├── server/             # 后端服务器
│   ├── src/            # 后端源代码
│   ├── data/           # SQLite数据库
│   └── logs/           # 服务器日志
└── docs/               # 项目文档
```

## 开发计划
详见 [TODO.md](./TODO.md)

## 快速开始

### 方式一：使用启动脚本（推荐）

#### macOS/Linux:
```bash
./start-dev.sh
```

#### Windows:
```bash
start-dev.bat
```

启动脚本会自动：
1. 安装所有依赖
2. 启动后端服务器 (http://localhost:3000)
3. 启动前端Expo开发服务器

### 方式二：手动启动

#### 1. 启动后端服务器
```bash
cd server
npm install
npm run dev
```

#### 2. 启动前端应用（新终端）
```bash
npm install --legacy-peer-deps
npm start
```

### 运行应用
- **iOS**: 在Expo中按 `i`
- **Android**: 在Expo中按 `a`
- **Web**: 在Expo中按 `w`

### 测试账号
```
邮箱: demo@xiaoxiang.com
密码: demo123
```

## 版本规划
- **MVP版本**: 消息 + 通讯录
- **二期**: 日历功能
- **三期**: 工作台功能

## 贡献指南
1. Fork 项目
2. 创建功能分支
3. 提交代码
4. 发起 Pull Request

## 许可证
MIT License