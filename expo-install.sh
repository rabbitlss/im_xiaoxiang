#!/bin/bash

echo "🚀 安装 Expo CLI 和项目依赖..."

# 检查是否已安装 Expo CLI
if ! command -v expo &> /dev/null; then
    echo "📦 安装 Expo CLI..."
    npm install -g expo-cli
else
    echo "✅ Expo CLI 已安装"
fi

# 安装项目依赖
echo "📦 安装项目依赖..."
npm install --legacy-peer-deps

echo "✅ 安装完成！"
echo ""
echo "🎯 现在可以运行以下命令:"
echo "  npm start       - 启动开发服务器"
echo "  npm run ios     - 在iOS模拟器中运行"
echo "  npm run android - 在Android模拟器中运行"
echo "  npm run web     - 在浏览器中运行"