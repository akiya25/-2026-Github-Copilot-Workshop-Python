/**
 * ロギングユーティリティ
 * 構造化ログ（DEBUG, INFO, WARN, ERROR レベル）
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // Cyan
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
};

const RESET = "\x1b[0m";

export class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = "info") {
    this.level = level;
  }

  private shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVELS[messageLevel] >= LOG_LEVELS[this.level];
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLog(
    level: LogLevel,
    message: string,
    data?: Record<string, any>
  ): string {
    const timestamp = this.formatTimestamp();
    const color = LOG_COLORS[level];
    const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${RESET}`;

    if (data && Object.keys(data).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(data)}`;
    }

    return `${prefix} ${message}`;
  }

  debug(message: string, data?: Record<string, any>): void {
    if (this.shouldLog("debug")) {
      console.log(this.formatLog("debug", message, data));
    }
  }

  info(message: string, data?: Record<string, any>): void {
    if (this.shouldLog("info")) {
      console.log(this.formatLog("info", message, data));
    }
  }

  warn(message: string, data?: Record<string, any>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatLog("warn", message, data));
    }
  }

  error(message: string, err?: Error | Record<string, any>): void {
    if (this.shouldLog("error")) {
      const data = err instanceof Error ? { message: err.message } : err;
      console.error(this.formatLog("error", message, data));
    }
  }
}

export const logger = new Logger(
  (process.env.LOG_LEVEL as LogLevel) || "info"
);
