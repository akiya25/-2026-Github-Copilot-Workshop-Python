/**
 * リファクタリング済みサーバー
 * モジュール分割、ログ、メトリクス、セッション管理を統合
 */

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { v4 as uuidv4 } from "uuid";

import { config, validateConfig } from "./config";
import { logger } from "./logger";
import { validateOrigin } from "./validation";
import { ClientConnection } from "./types";
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

// ========== セッション作成関数 ==========
async function setupSession(clientId: string) {
  try {
    logger.debug("Creating Copilot session", {
      clientId,
      model: config.copilotModel,
    });

    const session = await copilotClient.createSession({
      model: config.copilotModel,
      streaming: true,
      onPermissionRequest: approveAll,
    });

    logger.info("Copilot session created successfully", { clientId });

    // セッションをマネージャーに登録
    const conn = sessionManager.get(clientId);
    if (conn) {
      conn.session = session;
      setupSessionEventHandlers(session, conn.ws, clientId);
    }

    return session;
  } catch (err) {
    logger.error("Failed to create session", err as Error);
    metrics.recordError();
    throw new Error("Failed to create session");
  }
}

// ========== グレースフルシャットダウン ==========
async function shutdown() {
  logger.info("Shutting down server...");
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
      };

      // セッションマネージャーに登録
      sessionManager.set(clientId, connection);

      // セッション初期化（await で race condition を修正）
      setupSession(clientId).catch((err) => {
        logger.error("Session setup failed", err as Error);
        metrics.recordError();

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Failed to initialize session",
            })
          );
        }
      });

      // メッセージ受信処理
      ws.on("message", async (data) => {
        const conn = sessionManager.get(clientId);
        if (conn) {
          await handleMessage(data.toString(), ws, conn.session, clientId);
        }
      });

      // クローズ処理
      ws.on("close", async () => {
        const conn = sessionManager.get(clientId);
        if (conn) {
          await handleClose(conn.session, clientId);
          sessionManager.delete(clientId);
          metrics.recordDisconnection();
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
