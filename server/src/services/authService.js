const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const database = require('../models/database');
const logger = require('../utils/logger');

class AuthService {
  // Generate JWT tokens
  generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      name: user.name,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(
      { id: user.id, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    // Calculate expiration time in seconds
    const expiresIn = this.getTokenExpirationSeconds(config.jwt.expiresIn);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  // Calculate token expiration in seconds
  getTokenExpirationSeconds(expiresIn) {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) return 3600; // Default 1 hour

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return value * 86400;
      case 'h': return value * 3600;
      case 'm': return value * 60;
      case 's': return value;
      default: return 3600;
    }
  }

  // Hash password
  async hashPassword(password) {
    return bcrypt.hash(password, config.bcrypt.saltRounds);
  }

  // Verify password
  async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  // Create user
  async createUser(userData) {
    const { email, password, name, department, position, phone } = userData;

    // Check if user already exists
    const existingUser = await database.get(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      avatar: '',
      department: department || '',
      position: position || '',
      phone: phone || '',
      status: 'online',
    };

    await database.run(
      `INSERT INTO users (id, email, password, name, avatar, department, position, phone, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.email, user.password, user.name, user.avatar, user.department, user.position, user.phone, user.status]
    );

    // Remove password from returned user object
    delete user.password;
    return user;
  }

  // Login user
  async login(email, password) {
    // Find user by email
    const user = await database.get(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Update user status and last seen
    await database.run(
      'UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      ['online', user.id]
    );

    // Generate tokens
    const tokens = this.generateTokens(user);

    // Save refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Remove password from user object
    delete user.password;

    return {
      user,
      ...tokens,
    };
  }

  // Save refresh token
  async saveRefreshToken(userId, refreshToken) {
    const tokenId = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await database.run(
      'INSERT INTO refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)',
      [tokenId, userId, refreshToken, expiresAt.toISOString()]
    );
  }

  // Refresh access token
  async refreshToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch (error) {
      throw new Error('Invalid refresh token');
    }

    // Check if refresh token exists in database
    const tokenRecord = await database.get(
      'SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?',
      [refreshToken, decoded.id]
    );

    if (!tokenRecord) {
      throw new Error('Refresh token not found');
    }

    // Check if token is expired
    if (new Date(tokenRecord.expires_at) < new Date()) {
      await database.run('DELETE FROM refresh_tokens WHERE id = ?', [tokenRecord.id]);
      throw new Error('Refresh token expired');
    }

    // Get user
    const user = await database.get(
      'SELECT * FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!user) {
      throw new Error('User not found');
    }

    // Delete old refresh token
    await database.run('DELETE FROM refresh_tokens WHERE id = ?', [tokenRecord.id]);

    // Generate new tokens
    const tokens = this.generateTokens(user);

    // Save new refresh token
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    // Remove password from user object
    delete user.password;

    return {
      user,
      ...tokens,
    };
  }

  // Logout user
  async logout(userId, deviceId) {
    // Update user status
    await database.run(
      'UPDATE users SET status = ?, last_seen = CURRENT_TIMESTAMP WHERE id = ?',
      ['offline', userId]
    );

    // Remove all refresh tokens for this user
    await database.run(
      'DELETE FROM refresh_tokens WHERE user_id = ?',
      [userId]
    );

    logger.info('User logged out', { userId, deviceId });
  }

  // Verify access token
  async verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  // Get user by ID
  async getUserById(userId) {
    const user = await database.get(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );

    if (user) {
      delete user.password;
    }

    return user;
  }

  // Initialize default users (for development)
  async initializeDefaultUsers() {
    const defaultUsers = [
      {
        email: 'demo@xiaoxiang.com',
        password: 'demo123',
        name: '演示用户',
        department: '产品部',
        position: '产品经理',
        phone: '13800138000',
      },
      {
        email: 'zhangwei@xiaoxiang.com',
        password: 'password123',
        name: '张伟',
        department: '技术部',
        position: '前端工程师',
        phone: '13800138001',
      },
      {
        email: 'lina@xiaoxiang.com',
        password: 'password123',
        name: '李娜',
        department: '产品部',
        position: '产品经理',
        phone: '13800138002',
      },
    ];

    for (const userData of defaultUsers) {
      try {
        await this.createUser(userData);
        logger.info('Created default user', { email: userData.email });
      } catch (error) {
        // User might already exist, skip
        if (!error.message.includes('already exists')) {
          logger.error('Failed to create default user', { email: userData.email, error: error.message });
        }
      }
    }
  }
}

module.exports = new AuthService();