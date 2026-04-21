import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

// WebSocket URL を構築する関数（HTTPS対応）
const getWebSocketURL = (): string => {
  console.log("🔧 WebSocket URL を構築中...");
  // Vite プロキシを使用して、同一オリジンの WebSocket に接続
  // パスは /ws で、プロキシがホスト名ベースで :3001 にルーティング
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const url = `${protocol}://${window.location.host}/ws`;
  console.log("🔗 WebSocket URL:", url);
  return url;
};

export default function App() {
  console.log("📱 App コンポーネントがレンダリングされました");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectWebSocket = useCallback(() => {
    console.log("🔌 WebSocket への接続を試みています...");
    const ws = new WebSocket(getWebSocketURL());

    ws.onopen = () => {
      console.log("✅ WebSocket に接続しました");
      setIsConnected(true);
      console.log("WebSocket connected");
    };

    ws.onclose = () => {
      console.log("❌ WebSocket が切断されました。3秒後に再接続を試みます");
      setIsConnected(false);
      setIsLoading(false);
      console.log("WebSocket disconnected, retrying in 3s...");
      setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket エラー:", err);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === "delta") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + msg.content },
            ];
          } else {
            return [
              ...prev,
              {
                id: Date.now().toString(),
                role: "assistant",
                content: msg.content,
                isStreaming: true,
              },
            ];
          }
        });
      } else if (msg.type === "done") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant") {
            return [...prev.slice(0, -1), { ...last, isStreaming: false }];
          }
          return prev;
        });
        setIsLoading(false);
      } else if (msg.type === "error") {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `⚠️ エラー: ${msg.message}`,
            isStreaming: false,
          },
        ]);
        setIsLoading(false);
      }
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    console.log("🚀 useEffect: connectWebSocket を実行中...");
    connectWebSocket();
    return () => {
      console.log("🛑 クリーンアップ: WebSocket を閉じています");
      wsRef.current?.close();
    };
  }, [connectWebSocket]);

  const sendMessage = () => {
    if (!input.trim() || !isConnected || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    
    setMessages((prev) => [...prev, userMessage]);
    wsRef.current?.send(JSON.stringify({ type: "chat", content: input }));
    setInput("");
    setIsLoading(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
            <div className="message-role">{msg.role === "user" ? "あなた" : "Copilot"}</div>
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
