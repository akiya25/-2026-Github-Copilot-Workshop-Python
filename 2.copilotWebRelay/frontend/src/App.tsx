/**
 * 改善されたメインアプリケーション
 * カスタムフック(useChat, useWebSocket)を使用
 */

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat, type Message } from "./useChat";
import { useWebSocket } from "./useWebSocket";
import "./App.css";

/**
 * メインアプリケーション
 */
export default function App() {
  if (process.env.NODE_ENV === "development") {
    console.log("📱 App コンポーネントがレンダリングされました");
  }

  const [input, setInput] = useState("");
  const messagesEndRefForChat = useRef<HTMLDivElement>(null);

  const chat = useChat();
  
  // ハンドラーをメモ化（WebSocket 接続の再実行を防ぐ）
  const onDelta = useCallback(
    (content: string) => chat.handleStreamingResponse(content),
    [chat.handleStreamingResponse]
  );
  const onDone = useCallback(
    () => chat.finishStreaming(),
    [chat.finishStreaming]
  );
  const onError = useCallback(
    (message: string) => chat.addError(message),
    [chat.addError]
  );
  
  const { isConnected, send, connect, cleanup, wsRef } = useWebSocket(
    onDelta,
    onDone,
    onError
  );

  /**
   * メッセージスクロール
   */
  const scrollToBottom = () => {
    messagesEndRefForChat.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages]);

  // 接続初期化（マウント時のみ実行）
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🚀 useEffect: WebSocket 接続を初期化");
    }
    connect();

    return () => {
      if (process.env.NODE_ENV === "development") {
        console.log("🛑 クリーンアップ: WebSocket を閉じています");
      }
      cleanup();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  /**
   * メッセージ送信
   */
  const sendMessage = () => {
    if (!input.trim() || !isConnected || chat.isLoading) return;

    chat.addUserMessage(input);

    if (send(input)) {
      setInput("");
      chat.setIsLoading(true);
    } else {
      chat.addError("Failed to send message");
    }
  };

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
        {chat.messages.length === 0 && (
          <div className="empty-state">
            <p>GitHub Copilot に何でも聞いてみましょう！</p>
          </div>
        )}
        {chat.messages.map((msg: Message) => (
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
        <div ref={messagesEndRefForChat} />
      </div>

      <div className="input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="メッセージを入力... (Enter で送信, Shift+Enter で改行)"
          disabled={!isConnected || chat.isLoading}
          rows={3}
        />
        <button
          onClick={sendMessage}
          disabled={!isConnected || chat.isLoading || !input.trim()}
        >
          {chat.isLoading ? "送信中..." : "送信"}
        </button>
      </div>
    </div>
  );
}
