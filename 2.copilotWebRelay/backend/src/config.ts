/**
 * 設定管理（ハードコード値を一元化）
 */

export const config = {
  // サーバー設定
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Copilot SDK 設定
  copilotModel: process.env.COPILOT_MODEL || "gpt-5.4",

  // CORS 設定
  corsOrigins: (process.env.CORS_ORIGINS || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim()),

  // WebSocket 設定
  wsReconnectInterval: parseInt(
    process.env.WS_RECONNECT_INTERVAL || "3000",
    10
  ),
  wsHeartbeatInterval: parseInt(
    process.env.WS_HEARTBEAT_INTERVAL || "30000",
    10
  ),

  // セッションタイムアウト（ミリ秒）
  sessionIdleTimeout: parseInt(
    process.env.SESSION_IDLE_TIMEOUT || "600000",
    10
  ), // 10分
  sessionAbsoluteTimeout: parseInt(
    process.env.SESSION_ABSOLUTE_TIMEOUT || "1800000",
    10
  ), // 30分

  // メッセージサイズ制限
  maxMessageSize: parseInt(process.env.MAX_MESSAGE_SIZE || "4096", 10),
  maxContentLength: parseInt(process.env.MAX_CONTENT_LENGTH || "2000", 10),

  // ログ設定
  logLevel: (process.env.LOG_LEVEL || "info") as
    | "debug"
    | "info"
    | "warn"
    | "error",
};

export function validateConfig(): void {
  if (config.port < 1 || config.port > 65535) {
    throw new Error("Invalid PORT configuration");
  }

  if (config.corsOrigins.length === 0) {
    throw new Error("No CORS_ORIGINS configured");
  }

  if (config.sessionIdleTimeout < 0) {
    throw new Error("Invalid SESSION_IDLE_TIMEOUT");
  }
}
