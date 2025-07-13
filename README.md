# 小象聊天 - 企业级即时通讯工具

## 项目简介
小象聊天是一款专为企业设计的移动端即时通讯工具，提供高效的团队沟通和协作功能。

## 核心功能 (MVP版本)
- 💬 **消息模块**: 实时聊天、消息列表、多媒体消息
- 📱 **通讯录模块**: 组织架构、员工信息、快速搜索

## 技术栈
- **框架**: React Native + Expo
- **语言**: TypeScript
- **导航**: React Navigation 6.x
- **状态管理**: React Context (后续可升级Redux)
- **UI组件**: React Native内置组件 + 自定义组件

## 项目结构
```
src/
├── components/     # 公共组件
├── screens/        # 页面组件
├── navigation/     # 导航配置
├── types/          # TypeScript类型定义
├── utils/          # 工具函数
├── services/       # API服务
└── store/          # 状态管理
```

## 开发计划
详见 [TODO.md](./TODO.md)

## 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm start
```

### 运行应用
- iOS: `npm run ios`
- Android: `npm run android`
- Web: `npm run web`

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