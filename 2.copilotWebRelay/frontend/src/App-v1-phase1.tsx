import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

/**
 * メッセージインターフェース
 */
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

/**
 * WebSocket メッセージインターフェース
 */
interface WebSocketMessage {
  type: "delta" | "done" | "error" | "pong";
  content?: string;
  message?: string;
}

/**
 * WebSocket URL を構築する関数（HTTPS対応）
 */
const getWebSocketURL = (): string => {
  console.log("🔧 WebSocket URL を構築中...");
  // Vite プロキシを使用して、同一オリジンの WebSocket に接続
  // パスは /ws で、プロキシがホスト名ベースで :3001 にルーティング
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws`;
  console.log("🔗 WebSocket URL:", url);
  return url;
};

/**
 * useWebSocket フック
 * WebSocket 接続を管理し、メッセージ受信を処理
 */
function useWebSocket(
  onDelta: (content: string) => void,
  onDone: () => void,
  onError: (message: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    console.log("🔌 WebSocket への接続を試みています...");
    const ws = new WebSocket(getWebSocketURL());

    ws.onopen = () => {
      console.log("✅ WebSocket に接続しました");
      setIsConnected(true);

      // ハートビート開始
      heartbeatTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000); // 30秒ごと
    };

    ws.onclose = () => {
      console.log("❌ WebSocket が切断されました。3秒後に再接続を試みます");
      setIsConnected(false);
      cleanup();

      // 再接続スケジューリング
      reconnectTimerRef.current = setTimeout(connect, 3000);
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket エラー:", err);
      onError("WebSocket connection error");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage;

        if (msg.type === "delta" && msg.content) {
          onDelta(msg.content);
        } else if (msg.type === "done") {
          onDone();
        } else if (msg.type === "error" && msg.message) {
          onError(msg.message);
        }
        // pong は何もしない（疎通確認）
      } catch (err) {
        console.error("Failed to parse message:", err);
        onError("Failed to parse server message");
      }
    };

    wsRef.current = ws;
  }, [cleanup, onDelta, onDone, onError]);

  // 接続初期化
  useEffect(() => {
    console.log("🚀 useEffect: WebSocket 接続を初期化");
    connect();

    return () => {
      console.log("🛑 クリーンアップ: WebSocket を閉じています");
      cleanup();
      wsRef.current?.close();
    };
  }, [connect, cleanup]);

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

  return { isConnected, send };
}

/**
 * メインアプリケーション
 */
export default function App() {
  console.log("📱 App コンポーネントがレンダリングされました");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * メッセージスクロール
   */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  /**
   * WebSocket イベントハンドラー
   */
  const handleDelta = useCallback((content: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant" && last.isStreaming) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + content },
        ];
      } else {
        return [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content,
            isStreaming: true,
          },
        ];
      }
    });
  }, []);

  const handleDone = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        return [...prev.slice(0, -1), { ...last, isStreaming: false }];
      }
      return prev;
    });
    setIsLoading(false);
  }, []);

  const handleError = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `⚠️ エラー: ${message}`,
        isStreaming: false,
      },
    ]);
    setIsLoading(false);
  }, []);

  const { isConnected, send } = useWebSocket(
    handleDelta,
    handleDone,
    handleError
  );

  /**
   * メッセージ送信
   */
  const sendMessage = useCallback(() => {
    if (!input.trim() || !isConnected || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);

    if (send(input)) {
      setInput("");
      setIsLoading(true);
    } else {
      handleError("Failed to send message");
    }
  }, [input, isConnected, isLoading, send, handleError]);

  /**
   * キーボード処理
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🤖 Copilot Chat</h1>
        <span className={`status ${isConnected ? "connected" : "disconnected"}`}>
          {isConnected ? "● 接続中" : "● 切断中"}
        </span>
      </header>

      <div className="messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>GitHub Copilot に何でも聞いてみましょう！</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div className="message-role">
              {msg.role === "user" ? "あなた" : "Copilot"}
            </div>
            <div className="message-content">
              {msg.role === "assistant" ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p>{msg.content}</p>
              )}
              {msg.isStreaming && <span className="cursor">▊</span>}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力... (Enter で送信, Shift+Enter で改行)"
          disabled={!isConnected || isLoading}
          rows={3}
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected || isLoading || !input.trim()}
        >
          {isLoading ? "送信中..." : "送信"}
        </button>
      </div>
    </div>
  );
}
