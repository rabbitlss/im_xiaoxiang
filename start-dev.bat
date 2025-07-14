@echo off
echo 🚀 启动小象聊天开发环境...
echo.

:: 检查Node.js是否安装
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

:: 启动后端服务器
echo 📡 启动后端服务器...
cd server

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 安装后端依赖...
    call npm install
)

:: 在新窗口启动服务器
start "小象聊天 - 后端服务器" cmd /k npm run dev
echo ✅ 后端服务器已在新窗口启动
echo.

:: 等待服务器启动
timeout /t 3 /nobreak >nul

:: 返回项目根目录
cd ..

:: 启动前端
echo 📱 启动前端应用...

:: 检查是否已安装依赖
if not exist "node_modules" (
    echo 📦 安装前端依赖...
    call npm install --legacy-peer-deps
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✨ 开发环境已启动！
echo.
echo 📡 后端API: http://localhost:3000
echo 📱 前端应用: 即将在Expo中启动
echo.
echo 测试账号:
echo   邮箱: demo@xiaoxiang.com
echo   密码: demo123
echo.
echo 关闭此窗口将停止前端服务
echo 请手动关闭后端服务器窗口
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: 启动Expo
call npm start

pause