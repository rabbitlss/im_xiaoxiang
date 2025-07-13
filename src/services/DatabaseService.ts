import * as SQLite from 'expo-sqlite';
import { Message, Chat, User } from '@/types';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.WebSQLDatabase | null = null;

  private constructor() {}

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async initialize(): Promise<void> {
    try {
      this.db = SQLite.openDatabase('xiaoxiang_chat.db');
      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private createTables(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        // 用户表
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT,
            email TEXT,
            department TEXT,
            position TEXT,
            phone TEXT,
            status TEXT DEFAULT 'offline',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 聊天会话表
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL CHECK (type IN ('private', 'group')),
            name TEXT,
            avatar TEXT,
            last_message_id TEXT,
            unread_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // 会话参与者表
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS chat_participants (
            chat_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (chat_id, user_id),
            FOREIGN KEY (chat_id) REFERENCES chats(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          );
        `);

        // 消息表
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            sender_id TEXT NOT NULL,
            receiver_id TEXT,
            content TEXT NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('text', 'image', 'file')),
            timestamp INTEGER NOT NULL,
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id),
            FOREIGN KEY (sender_id) REFERENCES users(id)
          );
        `);

        // 创建索引
        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_messages_chat_timestamp 
          ON messages(chat_id, timestamp DESC);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_messages_sender 
          ON messages(sender_id);
        `);

        tx.executeSql(`
          CREATE INDEX IF NOT EXISTS idx_chats_updated 
          ON chats(updated_at DESC);
        `);
      }, 
      error => {
        console.error('Transaction failed:', error);
        reject(error);
      },
      () => {
        console.log('Tables created successfully');
        resolve();
      });
    });
  }

  // 用户相关操作
  public async saveUser(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO users 
           (id, name, avatar, email, department, position, phone, status, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user.id, user.name, user.avatar || null, user.email, 
           user.department, user.position, user.phone || null, user.status],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  public async getUser(userId: string): Promise<User | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users WHERE id = ?',
          [userId],
          (_, { rows }) => {
            if (rows.length > 0) {
              const row = rows.item(0);
              resolve({
                id: row.id,
                name: row.name,
                avatar: row.avatar,
                email: row.email,
                department: row.department,
                position: row.position,
                phone: row.phone,
                status: row.status
              });
            } else {
              resolve(null);
            }
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // 消息相关操作
  public async saveMessage(message: Message): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO messages 
           (id, chat_id, sender_id, receiver_id, content, type, timestamp, is_read) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [message.id, message.senderId, message.senderId, message.receiverId, 
           message.content, message.type, message.timestamp.getTime(), message.isRead ? 1 : 0],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  public async getMessages(chatId: string, limit: number = 20, offset: number = 0): Promise<Message[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM messages 
           WHERE chat_id = ? 
           ORDER BY timestamp DESC 
           LIMIT ? OFFSET ?`,
          [chatId, limit, offset],
          (_, { rows }) => {
            const messages: Message[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              messages.push({
                id: row.id,
                senderId: row.sender_id,
                receiverId: row.receiver_id,
                content: row.content,
                type: row.type,
                timestamp: new Date(row.timestamp),
                isRead: Boolean(row.is_read)
              });
            }
            resolve(messages.reverse()); // 返回正序
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // 聊天会话相关操作
  public async saveChat(chat: Chat): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT OR REPLACE INTO chats 
           (id, type, name, avatar, last_message_id, unread_count, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [chat.id, chat.type, chat.name || null, chat.avatar || null, 
           chat.lastMessage?.id || null, chat.unreadCount],
          () => resolve(),
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  public async getChats(): Promise<Chat[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT c.*, m.content as last_message_content, m.timestamp as last_message_time
           FROM chats c
           LEFT JOIN messages m ON c.last_message_id = m.id
           ORDER BY c.updated_at DESC`,
          [],
          (_, { rows }) => {
            const chats: Chat[] = [];
            for (let i = 0; i < rows.length; i++) {
              const row = rows.item(i);
              chats.push({
                id: row.id,
                type: row.type,
                name: row.name,
                avatar: row.avatar,
                participants: [], // 需要另外查询
                unreadCount: row.unread_count,
                lastMessage: row.last_message_content ? {
                  id: row.last_message_id,
                  senderId: '',
                  receiverId: '',
                  content: row.last_message_content,
                  type: 'text',
                  timestamp: new Date(row.last_message_time),
                  isRead: true
                } : undefined
              });
            }
            resolve(chats);
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }

  // 清理旧数据
  public async cleanupOldData(daysToKeep: number = 30): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

      this.db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM messages WHERE timestamp < ?',
          [cutoffTime],
          (_, result) => {
            console.log(`Cleaned up ${result.rowsAffected} old messages`);
            resolve();
          },
          (_, error) => {
            reject(error);
            return false;
          }
        );
      });
    });
  }
}