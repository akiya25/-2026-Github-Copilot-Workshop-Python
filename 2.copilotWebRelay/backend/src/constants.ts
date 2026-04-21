/**
 * 定数ファイル
 * ハードコード値を一元化
 */

export const CONSTANTS = {
  // タイムアウト（ミリ秒）
  RECONNECT_TIMEOUT: 3000,
  HEARTBEAT_INTERVAL: 30000,
  SESSION_IDLE_TIMEOUT: 10 * 60 * 1000, // 10分
  SESSION_ABSOLUTE_TIMEOUT: 30 * 60 * 1000, // 30分

  // メッセージサイズ
  MAX_MESSAGE_SIZE: 4096,
  MAX_CONTENT_LENGTH: 2000,

  // デフォルト値
  DEFAULT_PORT: 3001,
  DEFAULT_FRONTEND_PORT: 5173,
  DEFAULT_MODEL: "gpt-5.4",

  // エラーメッセージ
  ERRORS: {
    SESSION_NOT_READY: "Session not ready",
    INVALID_MESSAGE: "Invalid message format",
    CONNECTION_FAILED: "Failed to connect to server",
    SESSION_CREATION_FAILED: "Failed to create session",
    MESSAGE_SEND_FAILED: "Failed to send message",
  },

  // ログレベル
  LOG_LEVELS: {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
  },
} as const;
