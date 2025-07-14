import { IS_DEV } from './Constants';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  tag: string;
  message: string;
  data?: any;
}

export class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel = IS_DEV ? LogLevel.DEBUG : LogLevel.INFO;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private log(level: LogLevel, tag: string, message: string, data?: any): void {
    if (level < this.minLevel) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      tag,
      message,
      data,
    };

    // 添加到内存日志
    this.logs.push(logEntry);
    
    // 保持日志数量在限制内
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // 输出到控制台
    this.consoleLog(logEntry);
  }

  private consoleLog(entry: LogEntry): void {
    const { timestamp, level, tag, message, data } = entry;
    const timeStr = timestamp.toLocaleTimeString();
    const logMessage = `[${timeStr}] [${tag}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.log(`🔍 ${logMessage}`, data || '');
        break;
      case LogLevel.INFO:
        console.info(`ℹ️ ${logMessage}`, data || '');
        break;
      case LogLevel.WARN:
        console.warn(`⚠️ ${logMessage}`, data || '');
        break;
      case LogLevel.ERROR:
        console.error(`❌ ${logMessage}`, data || '');
        break;
    }
  }

  public debug(tag: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, tag, message, data);
  }

  public info(tag: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, tag, message, data);
  }

  public warn(tag: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, tag, message, data);
  }

  public error(tag: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, tag, message, data);
  }

  public getLogs(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logs.filter(log => log.level >= level);
    }
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public setMaxLogs(max: number): void {
    this.maxLogs = max;
    if (this.logs.length > max) {
      this.logs = this.logs.slice(-max);
    }
  }

  public exportLogs(): string {
    return this.logs
      .map(entry => {
        const { timestamp, level, tag, message, data } = entry;
        const levelStr = LogLevel[level];
        const timeStr = timestamp.toISOString();
        const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
        return `${timeStr} [${levelStr}] [${tag}] ${message}${dataStr}`;
      })
      .join('\n');
  }
}

// 创建全局日志实例
export const logger = Logger.getInstance();

// 便捷的标签化日志函数
export const createLogger = (tag: string) => ({
  debug: (message: string, data?: any) => logger.debug(tag, message, data),
  info: (message: string, data?: any) => logger.info(tag, message, data),
  warn: (message: string, data?: any) => logger.warn(tag, message, data),
  error: (message: string, data?: any) => logger.error(tag, message, data),
});