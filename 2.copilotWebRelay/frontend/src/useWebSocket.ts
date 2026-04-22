/**
 * useWebSocket - WebSocket接続管理フック
 */

import { useState, useRef, useCallback, useEffect } from "react";

interface WebSocketMessage {
  type: "delta" | "done" | "error" | "pong";
  content?: string;
  message?: string;
}

interface Handlers {
  onDelta: (content: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

const getWebSocketURL = (): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws`;
};

export function useWebSocket(
  onDelta: (content: string) => void,
  onDone: () => void,
  onError: (message: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handlersRef = useRef<Handlers>({ onDelta, onDone, onError });
  const isInitialConnectionRef = useRef(true);

  // handlersRef を常に最新に保つ（依存関係の外）
  useEffect(() => {
    handlersRef.current = { onDelta, onDone, onError };
  }, [onDelta, onDone, onError]);

  // クリーンアップ関数
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  // WebSocket 接続
  const connect = useCallback(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔌 WebSocket への接続を試みています...");
    }
    const ws = new WebSocket(getWebSocketURL());

    ws.onopen = () => {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ WebSocket に接続しました");
      }
      setIsConnected(true);
      isInitialConnectionRef.current = false;

      // ハートビート開始（30秒ごと）
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify({ type: "ping" }));
          } catch (err) {
            if (process.env.NODE_ENV === "development") {
              console.error("Failed to send ping:", err);
            }
          }
        }
      }, 30000);
    };

    ws.onclose = () => {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ WebSocket が切断されました。3秒後に再接続を試みます");
      }
      setIsConnected(false);
      ws.onclose = null;
      cleanup();

      // 再接続スケジューリング
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      if (process.env.NODE_ENV === "development") {
        console.error("❌ WebSocket エラー:", err);
      }
      // 初回接続時のエラーは無視（自動的に再接続される）
      if (!isInitialConnectionRef.current) {
        handlersRef.current.onError("WebSocket connection error");
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage;

        if (msg.type === "delta" && msg.content) {
          handlersRef.current.onDelta(msg.content);
        } else if (msg.type === "done") {
          handlersRef.current.onDone();
        } else if (msg.type === "error" && msg.message) {
          handlersRef.current.onError(msg.message);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to parse message:", err);
        }
        handlersRef.current.onError("Failed to parse server message");
      }
    };

    wsRef.current = ws;
  }, [cleanup]);

  // メッセージ送信
  const send = useCallback((message: string): boolean => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(
          JSON.stringify({ type: "chat", content: message })
        );
        return true;
      } catch (err) {
        console.error("Failed to send message:", err);
        return false;
      }
    }
    return false;
  }, []);

  return {
    isConnected,
    send,
    connect,
    cleanup,
    wsRef,
  };
}
