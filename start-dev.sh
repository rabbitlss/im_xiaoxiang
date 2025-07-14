#!/bin/bash

echo "🚀 启动小象聊天开发环境..."
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到Node.js，请先安装Node.js"
    exit 1
fi

# 启动后端服务器
echo "📡 启动后端服务器..."
cd server

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装后端依赖..."
    npm install
fi

# 在后台启动服务器
npm run dev &
SERVER_PID=$!
echo "✅ 后端服务器已启动 (PID: $SERVER_PID)"
echo ""

# 等待服务器启动
sleep 3

# 返回项目根目录
cd ..

# 启动前端
echo "📱 启动前端应用..."

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install --legacy-peer-deps
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ 开发环境已启动！"
echo ""
echo "📡 后端API: http://localhost:3000"
echo "📱 前端应用: 即将在Expo中启动"
echo ""
echo "测试账号:"
echo "  邮箱: demo@xiaoxiang.com"
echo "  密码: demo123"
echo ""
echo "按 Ctrl+C 停止所有服务"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动Expo
npm start

# 清理：当脚本退出时，终止后端服务器
trap "echo '正在停止服务...'; kill $SERVER_PID 2>/dev/null; exit" INT TERM EXIT