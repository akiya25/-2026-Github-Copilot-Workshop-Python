/**
 * リファクタリング済みサーバー
 * モジュール分割、ログ、メトリクス、セッション管理を統合
 */

import "dotenv/config";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { v4 as uuidv4 } from "uuid";

import { config, validateConfig } from "./config";
import { logger } from "./logger";
import { validateOrigin } from "./validation";
import { ClientConnection, SessionState } from "./types";
import { metrics } from "./metrics";
import { sessionManager } from "./session-manager";
import { handleMessage, setupSessionEventHandlers, handleClose } from "./handlers";

// 設定検証
validateConfig();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  verifyClient: (info, callback) => {
    const origin = info.req.headers.origin;

    if (!validateOrigin(origin, config.corsOrigins)) {
      logger.warn("Rejected connection from invalid origin", { origin });
      callback(false, 403, "Forbidden");
      return;
    }

    callback(true);
  },
});

// ========== セッション状態トラッキング ==========
const sessionStates = new Map<string, SessionState>();

function getSessionState(clientId: string): SessionState | undefined {
  return sessionStates.get(clientId);
}

function isSessionReady(clientId: string): boolean {
  const state = sessionStates.get(clientId);
  return state?.isReady === true && state?.isDisconnected === false;
}

function markSessionReady(clientId: string): void {
  const state = sessionStates.get(clientId);
  if (state) {
    state.isReady = true;
    state.lastActivityAt = new Date();
  }
}

function markSessionDisconnected(clientId: string): void {
  const state = sessionStates.get(clientId);
  if (state) {
    state.isDisconnected = true;
  }
}

// ========== ミドルウェア ==========
app.use(express.json());

// CORS ミドルウェア
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && validateOrigin(origin, config.corsOrigins)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  next();
});

// ========== ヘルスチェック ==========
app.get("/health/live", (req, res) => {
  res.json({ status: "alive" });
});

app.get("/health/ready", (req, res) => {
  res.json({
    status: "ready",
    websocket: "configured",
    model: config.copilotModel,
    sessions: sessionManager.size(),
  });
});

// ========== メトリクスエンドポイント ==========
app.get("/metrics", (req, res) => {
  res.json(metrics.getMetrics());
});

// ========== デバッグエンドポイント ==========
app.get("/debug/status", (req, res) => {
  res.json({
    status: "ok",
    websocket: "ready",
    model: config.copilotModel,
    env: config.nodeEnv,
    activeSessions: sessionManager.size(),
  });
});

app.get("/debug/info", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Debug Info</title></head>
    <body style="background: #0d1117; color: #e6edf3; font-family: monospace; padding: 20px;">
      <h1>🔧 Copilot Chat - Debug Info</h1>
      <p>✅ Backend is running</p>
      <p>✅ WebSocket server is configured</p>
      <p>Model: ${config.copilotModel}</p>
      <p>Environment: ${config.nodeEnv}</p>
      <p>Active Sessions: <span id="sessions">0</span></p>
      <p><a href="http://localhost:5173" style="color: #1f6feb;">Open App</a></p>
      <p><a href="/metrics" style="color: #1f6feb;">View Metrics</a></p>
      <script>
        setInterval(() => {
          fetch('/metrics')
            .then(r => r.json())
            .then(d => document.getElementById('sessions').textContent = d.activeConnections)
            .catch(console.error);
        }, 1000);
      </script>
    </body>
    </html>
  `);
});

// ========== グローバル変数 ==========
const copilotClient = new CopilotClient();
const SESSION_SETUP_MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 500; // ms

// ========== リトライ機能（Exponential Backoff） ==========
async function exponentialBackoffRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 500
): Promise<T> {
  let lastError: Error = new Error("Unknown error");

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelay * Math.pow(2, attempt);
        logger.warn("Retry attempt", {
          attempt: attempt + 1,
          maxRetries,
          delayMs,
          error: lastError.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}

// ========== セッション作成関数（改善版・リトライ対応） ==========
async function setupSessionSafely(clientId: string): Promise<void> {
  try {
    // セッション状態の初期化
    if (!sessionStates.has(clientId)) {
      sessionStates.set(clientId, {
        isReady: false,
        isDisconnected: false,
        createdAt: new Date(),
        lastActivityAt: new Date(),
      });
    }

    logger.debug("Creating Copilot session with retry", {
      clientId,
      model: config.copilotModel,
    });

    // Exponential backoff retry を適用
    const session = await exponentialBackoffRetry(
      () =>
        copilotClient.createSession({
          model: config.copilotModel,
          streaming: true,
          onPermissionRequest: approveAll,
        }),
      SESSION_SETUP_MAX_RETRIES,
      INITIAL_RETRY_DELAY
    );

    logger.info("Copilot session created successfully", { clientId });

    // セッションをマネージャーに登録
    const conn = sessionManager.get(clientId);
    if (conn) {
      conn.session = session;
      conn.sessionReady = true;

      // イベントハンドラーセットアップ
      conn.handlers = setupSessionEventHandlers(session, conn.ws, clientId);

      // セッション状態を ready に更新
      markSessionReady(clientId);
    }
  } catch (err) {
    logger.error("Failed to create session after retries", err as Error);
    metrics.recordError();

    // セッション状態をクリーンアップ
    sessionStates.delete(clientId);

    // クライアントに通知
    const conn = sessionManager.get(clientId);
    if (conn?.ws.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(
          JSON.stringify({
            type: "error",
            message: "Failed to initialize session. Please try again.",
          })
        );
      } catch (sendErr) {
        logger.debug("Error sending initialization error", { clientId });
      }
    }
  }
}

// ========== グレースフルシャットダウン ==========
async function shutdown() {
  logger.info("Shutting down server...");
  
  // すべてのセッションをクローズ
  for (const conn of sessionManager.getAll()) {
    try {
      const clientId = conn.clientId;

      // ハンドラーのクリーンアップ
      if (conn.handlers?.cleanup) {
        conn.handlers.cleanup();
      }

      // セッション状態をマーク
      markSessionDisconnected(clientId);

      // セッションクローズ
      if (conn.session) {
        await conn.session.disconnect().catch(() => {
          // 既に切断の可能性あり
        });
      }

      // WebSocket クローズ
      if (conn.ws?.readyState === WebSocket.OPEN) {
        conn.ws.onclose = null;
        conn.ws.close();
      }
    } catch (err) {
      logger.debug("Error during shutdown", { error: String(err) });
    }
  }

  await sessionManager.closeAll();
  
  server.close(() => {
    logger.info("Server shut down gracefully");
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// ========== メインサーバーロジック ==========
async function main() {
  try {
    // Copilot クライアント開始
    await copilotClient.start();
    logger.info("Copilot SDK client initialized");

    // ========== WebSocket コネクション処理 ==========
    wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
      const clientId = uuidv4();
      const ip = req.socket.remoteAddress;

      logger.info("New client connection", { clientId, ip });
      metrics.recordConnection();

      // クライアント接続情報を作成
      const connection: ClientConnection = {
        ws,
        session: null,
        clientId,
        connectedAt: new Date(),
        sessionReady: false,
      };

      // セッションマネージャーに登録
      sessionManager.set(clientId, connection);

      // セッション初期化
      void setupSessionSafely(clientId);

      // メッセージ受信処理
      ws.on("message", async (data) => {
        const conn = sessionManager.get(clientId);
        
        // セッション状態チェック
        if (!conn) {
          logger.warn("Connection not found", { clientId });
          return;
        }

        if (!isSessionReady(clientId)) {
          logger.warn("Session not ready, rejecting message", { clientId });
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: "Session is not ready yet",
              })
            );
          }
          return;
        }

        // メッセージ処理
        try {
          await handleMessage(data.toString(), ws, conn.session, clientId);
          
          // 最後のアクティビティ時刻を更新
          const state = getSessionState(clientId);
          if (state) {
            state.lastActivityAt = new Date();
          }
        } catch (err) {
          logger.error("Error handling message", err as Error);
          metrics.recordError();
        }
      });

      // クローズ処理
      ws.on("close", async () => {
        const conn = sessionManager.get(clientId);
        if (conn) {
          try {
            markSessionDisconnected(clientId);
            
            // ハンドラーと共にクローズ
            await handleClose(conn.session, clientId, conn.handlers);
          } catch (err) {
            logger.error("Error during close handling", err as Error);
          } finally {
            sessionManager.delete(clientId);
            sessionStates.delete(clientId);
            metrics.recordDisconnection();
          }
        }
      });

      // エラーハンドラー
      ws.on("error", (err) => {
        logger.error("WebSocket error", err as Error);
        metrics.recordError();
      });
    });

    // ========== サーバー起動 ==========
    server.listen(config.port, () => {
      logger.info("🚀 Server started successfully", {
        port: config.port,
        env: config.nodeEnv,
        model: config.copilotModel,
        corsOrigins: config.corsOrigins.join(","),
      });
      logger.info("📊 Available endpoints", {
        health: "GET /health/live, /health/ready",
        metrics: "GET /metrics",
        debug: "GET /debug/status, /debug/info",
      });
    });
  } catch (err) {
    logger.error("Fatal error during startup", err as Error);
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error("Unexpected error", err as Error);
  process.exit(1);
});
