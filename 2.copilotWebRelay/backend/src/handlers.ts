/**
 * WebSocket ハンドラー
 * メッセージ処理ロジックを集約
 */

import { WebSocket } from "ws";
import {
  validateMessage,
  validateOrigin,
} from "./validation";
import {
  CopilotSessionType,
  sanitizeError,
  SessionError,
  ValidationError,
} from "./types";
import { logger } from "./logger";
import { metrics } from "./metrics";
import { config } from "./config";

/**
 * メッセージハンドラー
 */
export async function handleMessage(
  data: string,
  ws: WebSocket,
  session: CopilotSessionType | null,
  clientId: string
): Promise<void> {
  try {
    // 入力値検証
    const msg = validateMessage(data);
    metrics.recordMessage();

    if (msg.type === "chat") {
      if (!session) {
        throw new SessionError("Session not ready");
      }

      logger.debug("Processing chat message", {
        clientId,
        contentLength: msg.content?.length,
      });

      // メッセージ送信
      await session.send({
        prompt: msg.content!,
      });
    } else if (msg.type === "ping") {
      // ハートビート対応
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    }
  } catch (err) {
    metrics.recordError();
    logger.warn("Message processing error", {
      clientId,
      error: String(err),
    });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: sanitizeError(err),
        })
      );
    }
  }
}

/**
 * セッションイベントハンドラーセットアップ
 */
export function setupSessionEventHandlers(
  session: CopilotSessionType,
  ws: WebSocket,
  clientId: string
): void {
  session.on("assistant.message_delta", (event: any) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: "delta",
            content: event.data?.deltaContent || "",
          })
        );
      } catch (err) {
        logger.debug("Error sending delta", { clientId });
      }
    }
  });

  session.on("session.idle", () => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "done" }));
      } catch (err) {
        logger.debug("Error sending done", { clientId });
      }
    }
  });

  session.on("error", (err: any) => {
    logger.error("Session error", { clientId, error: String(err) });
    metrics.recordError();

    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Session error occurred",
          })
        );
      } catch (sendErr) {
        logger.debug("Error sending error message", { clientId });
      }
    }
  });
}

/**
 * クローズハンドラー
 */
export async function handleClose(
  session: CopilotSessionType | null,
  clientId: string
): Promise<void> {
  try {
    if (session) {
      await session.disconnect().catch(() => {
        // 既に切断の可能性あり
      });
    }
    logger.info("Client connection closed", { clientId });
  } catch (err) {
    logger.debug("Error closing session", { clientId });
  }
}
