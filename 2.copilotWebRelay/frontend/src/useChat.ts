/**
 * useChat - チャット状態管理フック
 * Immer を使用した効率的なストリーミング実装
 */

import { useState, useCallback } from "react";
import { produce } from "immer";
import { v4 as uuidv4 } from "uuid";

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
      id: uuidv4(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMessage]);
  }, []);

  // Immer を使用した効率的なストリーミング更新
  const handleStreamingResponse = useCallback((content: string) => {
    setMessages(
      produce((draft) => {
        const last = draft[draft.length - 1];
        
        if (last && last.role === "assistant" && last.isStreaming) {
          // 既存のアシスタントメッセージに追記（Immer で効率的）
          last.content += content;
        } else {
          // 新しいアシスタントメッセージを作成
          draft.push({
            id: uuidv4(),
            role: "assistant",
            content,
            isStreaming: true,
          });
        }
      })
    );
  }, []);

  const finishStreaming = useCallback(() => {
    setMessages(
      produce((draft) => {
        const last = draft[draft.length - 1];
        if (last && last.role === "assistant") {
          last.isStreaming = false;
        }
      })
    );
    setIsLoading(false);
  }, []);

  const addError = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: uuidv4(),
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
