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
 * セッションイベントハンドラー用の型定義
 */
interface SessionHandlers {
  onMessageDelta: (event: any) => void;
  onSessionIdle: () => void;
  onSessionError: (err: any) => void;
  cleanup: () => void;
}

/**
 * セッションイベントハンドラーセットアップ
 * リスナー削除機構を備えたハンドラー管理
 */
export function setupSessionEventHandlers(
  session: CopilotSessionType,
  ws: WebSocket,
  clientId: string
): SessionHandlers {
  // ハンドラー関数を別途定義（削除時に参照が必要）
  const onMessageDelta = (event: any) => {
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
  };

  const onSessionIdle = () => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "done" }));
      } catch (err) {
        logger.debug("Error sending done", { clientId });
      }
    }
  };

  const onSessionError = (err: any) => {
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
  };

  // イベントリスナー登録
  session.on("assistant.message_delta", onMessageDelta);
  session.on("session.idle", onSessionIdle);
  session.on("error", onSessionError);

  // クリーンアップ関数：すべてのリスナーを削除
  const cleanup = () => {
    try {
      session.removeListener?.("assistant.message_delta", onMessageDelta);
      session.removeListener?.("session.idle", onSessionIdle);
      session.removeListener?.("error", onSessionError);
      logger.debug("Session event listeners cleaned up", { clientId });
    } catch (err) {
      logger.debug("Error during listener cleanup", { clientId, error: String(err) });
    }
  };

  return {
    onMessageDelta,
    onSessionIdle,
    onSessionError,
    cleanup,
  };
}

/**
 * クローズハンドラー
 * リスナー削除を含む完全なクリーンアップ、リトライ対応
 */
export async function handleClose(
  session: CopilotSessionType | null,
  clientId: string,
  handlers?: SessionHandlers
): Promise<void> {
  try {
    // イベントリスナーの削除
    if (handlers?.cleanup) {
      handlers.cleanup();
    }

    // セッションの切断（リトライなし、タイムアウト付き）
    if (session) {
      try {
        // disconnect を行うが、リトライは行わない（迅速に完了させる）
        await Promise.race([
          session.disconnect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("disconnect timeout")), 1000)
          ),
        ]);
      } catch (err) {
        logger.debug("Session disconnect error", {
          clientId,
          error: String(err),
        });
      }
    }

    logger.info("Client connection closed", { clientId });
  } catch (err) {
    logger.debug("Error closing session", { clientId, error: String(err) });
  }
}
