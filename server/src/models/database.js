const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.db = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const dbPath = path.resolve(config.database.path);
      const dbDir = path.dirname(dbPath);

      // Ensure database directory exists
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Database connection failed:', err);
          reject(err);
        } else {
          logger.info('Connected to SQLite database');
          this.db.run('PRAGMA foreign_keys = ON');
          resolve(this.db);
        }
      });
    });
  }

  async initialize() {
    try {
      await this.connect();
      await this.createTables();
      await this.seedData();
      logger.info('Database initialized successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createTables() {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        department TEXT,
        position TEXT,
        phone TEXT,
        status TEXT DEFAULT 'offline',
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Refresh tokens table
      `CREATE TABLE IF NOT EXISTS refresh_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        status TEXT DEFAULT 'sent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Conversations table
      `CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        user1_id TEXT NOT NULL,
        user2_id TEXT NOT NULL,
        last_message_id TEXT,
        last_message_time TIMESTAMP,
        unread_count_user1 INTEGER DEFAULT 0,
        unread_count_user2 INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL,
        UNIQUE(user1_id, user2_id)
      )`,

      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)`,
      `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user1_id, user2_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at)`,
    ];

    for (const query of queries) {
      await this.run(query);
    }
  }

  async seedData() {
    // Check if we already have users
    const userCount = await this.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count > 0) {
      logger.info('Database already has data, skipping seed');
      return;
    }

    logger.info('Seeding database with initial data');

    // Create some test users (passwords will be hashed by the auth service)
    const testUsers = [
      {
        id: 'user-001',
        email: 'zhangwei@xiaoxiang.com',
        name: '张伟',
        department: '技术部',
        position: '前端工程师',
        phone: '13800138001',
      },
      {
        id: 'user-002',
        email: 'lina@xiaoxiang.com',
        name: '李娜',
        department: '产品部',
        position: '产品经理',
        phone: '13800138002',
      },
      {
        id: 'user-003',
        email: 'wangqiang@xiaoxiang.com',
        name: '王强',
        department: '技术部',
        position: '后端工程师',
        phone: '13800138003',
      },
      {
        id: 'user-004',
        email: 'zhaoli@xiaoxiang.com',
        name: '赵丽',
        department: '设计部',
        position: 'UI设计师',
        phone: '13800138004',
      },
      {
        id: 'user-005',
        email: 'chenming@xiaoxiang.com',
        name: '陈明',
        department: '技术部',
        position: '技术总监',
        phone: '13800138005',
      },
    ];

    // Note: In production, passwords should be hashed. This will be done by the auth service.
    // For now, we'll skip user seeding here and let the auth service handle user creation.
    logger.info('Initial database setup complete');
  }

  // Database operation methods
  run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) {
          logger.error('Database query error:', { query, error: err.message });
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) {
          logger.error('Database query error:', { query, error: err.message });
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          logger.error('Database query error:', { query, error: err.message });
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          logger.error('Error closing database:', err);
          reject(err);
        } else {
          logger.info('Database connection closed');
          resolve();
        }
      });
    });
  }
}

// Create singleton instance
const database = new Database();

module.exports = database;