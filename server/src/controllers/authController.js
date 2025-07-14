const authService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  // User login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info('Login attempt', { email });

      const result = await authService.login(email, password);

      logger.info('Login successful', { userId: result.user.id, email });

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        },
      });
    } catch (error) {
      logger.error('Login failed', { error: error.message, email: req.body.email });

      if (error.message === 'Invalid email or password') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Login failed',
        },
      });
    }
  }

  // User registration
  async register(req, res) {
    try {
      const { email, password, name, department, position, phone } = req.body;

      logger.info('Registration attempt', { email, name });

      // Create user
      const user = await authService.createUser({
        email,
        password,
        name,
        department,
        position,
        phone,
      });

      // Auto-login after registration
      const result = await authService.login(email, password);

      logger.info('Registration successful', { userId: user.id, email });

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        },
      });
    } catch (error) {
      logger.error('Registration failed', { error: error.message, email: req.body.email });

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists',
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Registration failed',
        },
      });
    }
  }

  // Refresh access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      const result = await authService.refreshToken(refreshToken);

      logger.info('Token refreshed', { userId: result.user.id });

      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          tokens: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        },
      });
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });

      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Token refresh failed',
        },
      });
    }
  }

  // User logout
  async logout(req, res) {
    try {
      const userId = req.user.id;
      const deviceId = req.body.deviceId;

      await authService.logout(userId, deviceId);

      res.json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      logger.error('Logout failed', { error: error.message, userId: req.user.id });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Logout failed',
        },
      });
    }
  }

  // Get current user
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;

      const user = await authService.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      res.json({
        success: true,
        data: {
          user,
        },
      });
    } catch (error) {
      logger.error('Get current user failed', { error: error.message, userId: req.user.id });

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get user information',
        },
      });
    }
  }
}

module.exports = new AuthController();