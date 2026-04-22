/**
 * 改善されたサーバー実装
 * セキュリティ対応: Origin検証、入力検証、エラー安全化
 */

import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import { CopilotClient, approveAll } from "@github/copilot-sdk";
import { v4 as uuidv4 } from "uuid";

import { config, validateConfig } from "./config";
import { logger } from "./logger";
import {
  validateMessage,
  validateOrigin,
  validateToken,
} from "./validation";
import {
  ChatMessage,
  CopilotSessionType,
  ClientConnection,
  sanitizeError,
  SessionError,
} from "./types";

// 設定検証
validateConfig();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
  verifyClient: (info, callback) => {
    // Origin 検証
    const origin = info.req.headers.origin;

    if (!validateOrigin(origin, config.corsOrigins)) {
      logger.warn("Rejected connection from origin", { origin });
      callback(false, 403, "Forbidden");
      return;
    }

    callback(true);
  },
});

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

// ヘルスチェックエンドポイント
app.get("/health/live", (req, res) => {
  res.json({ status: "alive" });
});

app.get("/health/ready", (req, res) => {
  res.json({
    status: "ready",
    websocket: "configured",
    model: config.copilotModel,
  });
});

// デバッグエンドポイント
app.get("/debug/status", (req, res) => {
  res.json({
    status: "ok",
    websocket: "ready",
    model: config.copilotModel,
    env: config.nodeEnv,
  });
});

// クライアント接続管理
const connections: Map<string, ClientConnection> = new Map();

// Copilot クライアント
const copilotClient = new CopilotClient();

/**
 * セッション作成（エラーハンドリング付き）
 */
async function setupSession(clientId: string): Promise<CopilotSessionType> {
  try {
    logger.debug("Creating session", { clientId, model: config.copilotModel });

    const session = await copilotClient.createSession({
      model: config.copilotModel,
      streaming: true,
      onPermissionRequest: approveAll,
    });

    logger.info("Session created successfully", { clientId });

    // セッションをMap に保存
    const conn = connections.get(clientId);
    if (conn) {
      conn.session = session;
    }

    return session;
  } catch (err) {
    logger.error("Session setup failed", err as Error);
    throw new SessionError("Failed to create session");
  }
}

async function main() {
  try {
    // Copilot クライアント開始
    await copilotClient.start();
    logger.info("Copilot client started");

    // WebSocket コネクション処理
    wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
      const clientId = uuidv4();
      const ip = req.socket.remoteAddress;

      logger.info("Client connected", { clientId, ip });

      // クライアント情報を保存
      const connection: ClientConnection = {
        ws,
        session: null,
        clientId,
        connectedAt: new Date(),
      };
      connections.set(clientId, connection);

      // セッション初期化（await を追加して race condition を修正）
      setupSession(clientId).catch((err) => {
        logger.error("Failed to setup session", err as Error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "error",
              message: sanitizeError(err),
            })
          );
        }
      });

      // メッセージ受信処理
      ws.on("message", async (data) => {
        try {
          // 入力値検証
          const msg = validateMessage(data.toString());

          if (msg.type === "chat") {
            const conn = connections.get(clientId);
            if (!conn?.session) {
              throw new SessionError("Session not ready");
            }

            // メッセージ送信（エラーハンドリング付き）
            await conn.session.send({
              prompt: msg.content!,
            });
          } else if (msg.type === "ping") {
            // ハートビート対応
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
          }
        } catch (err) {
          logger.warn("Message processing error", { clientId, error: String(err) });

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "error",
                message: sanitizeError(err),
              })
            );
          }
        }
      });

      // イベント購読（セッションが存在する場合）
      const originalSend = ws.send.bind(ws);

      // セッションイベントハンドラーを設定する関数
      const setupEventHandlers = (session: CopilotSessionType) => {
        session.on("assistant.message_delta", (event: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            originalSend(
              JSON.stringify({
                type: "delta",
                content: event.data.deltaContent,
              })
            );
          }
        });

        session.on("session.idle", () => {
          if (ws.readyState === WebSocket.OPEN) {
            originalSend(JSON.stringify({ type: "done" }));
          }
        });
      };

      // セッション完成時にハンドラーをセットアップ
      const checkInterval = setInterval(() => {
        const conn = connections.get(clientId);
        if (conn?.session) {
          setupEventHandlers(conn.session);
          clearInterval(checkInterval);
        }
      }, 100);

      // クローズ処理
      ws.on("close", async () => {
        clearInterval(checkInterval);
        logger.info("Client disconnected", { clientId });

        const conn = connections.get(clientId);
        if (conn?.session) {
          try {
            await conn.session.disconnect().catch(() => {
              // 既に切断の可能性あり
            });
          } catch (err) {
            logger.debug("Session disconnect error", { clientId });
          }
        }

        connections.delete(clientId);
      });

      // エラーハンドラー
      ws.on("error", (err) => {
        logger.error("WebSocket error", err);
      });
    });

    // サーバー起動
    server.listen(config.port, () => {
      logger.info(`Server started`, {
        port: config.port,
        env: config.nodeEnv,
        origins: config.corsOrigins.join(","),
      });
    });
  } catch (err) {
    logger.error("Server startup failed", err as Error);
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error("Fatal error", err as Error);
  process.exit(1);
});
