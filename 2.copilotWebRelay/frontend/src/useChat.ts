/**
 * useChat - チャット状態管理フック
 */

import { useState, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addUserMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
  }, []);

  const handleStreamingResponse = useCallback((content: string) => {
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

  const finishStreaming = useCallback(() => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === "assistant") {
        return [...prev.slice(0, -1), { ...last, isStreaming: false }];
      }
      return prev;
    });
    setIsLoading(false);
  }, []);

  const addError = useCallback((message: string) => {
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

  const clear = useCallback(() => {
    setMessages([]);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    setIsLoading,
    addUserMessage,
    handleStreamingResponse,
    finishStreaming,
    addError,
    clear,
  };
}
