const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./utils/logger');
const database = require('./models/database');
const authService = require('./services/authService');

// Import routes
const authRoutes = require('./routes/auth');

// Create Express app
const app = express();

// Basic security headers
app.use(helmet());

// Enable CORS
app.use(cors(config.cors));

// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use('/api/auth', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

// API routes
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: config.env === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// Initialize and start server
async function startServer() {
  try {
    // Initialize database
    await database.initialize();
    logger.info('Database initialized');

    // Initialize default users (for development)
    if (config.env === 'development') {
      await authService.initializeDefaultUsers();
    }

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      console.log(`
🚀 小象聊天服务器已启动
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌐 API地址: http://localhost:${config.port}
📡 WebSocket地址: ws://localhost:${config.ws.port}
🔧 环境: ${config.env}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

测试账号:
  邮箱: demo@xiaoxiang.com
  密码: demo123

API端点:
  POST /api/auth/login    - 用户登录
  POST /api/auth/register - 用户注册
  POST /api/auth/refresh  - 刷新令牌
  POST /api/auth/logout   - 用户登出
  GET  /api/auth/me       - 获取当前用户
  GET  /health            - 健康检查
      `);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        database.close().then(() => {
          logger.info('Database connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Start the server
startServer();