/**
 * Backend 型定義ファイル
 * WebSocket メッセージ、セッション、エラーの型定義
 */

// WebSocket メッセージ型
export interface ChatMessage {
  type: "chat" | "delta" | "done" | "error" | "ping" | "pong";
  content?: string;
  message?: string;
}

// Copilot Session 型（any の代わり）
export interface CopilotSessionType {
  send(options: { prompt: string }): Promise<string | void>;
  disconnect(): Promise<void>;
  on(event: string, handler: (event: any) => void): void;
  removeListener?(event: string, handler: (event: any) => void): void;
}

// WebSocket 接続情報
export interface ClientConnection {
  ws: any; // WebSocket インスタンス
  session: CopilotSessionType | null;
  clientId: string;
  connectedAt: Date;
  sessionReady?: boolean;
  handlers?: any;
}

// セッション状態トラッキング
export interface SessionState {
  isReady: boolean;
  isDisconnected: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

// 検証エラー
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// セッションエラー
export class SessionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionError";
  }
}

// 安全なエラーメッセージ（内部情報を隠す）
export function sanitizeError(err: unknown): string {
  if (err instanceof ValidationError) {
    return `Invalid input: ${err.message}`;
  }
  if (err instanceof SessionError) {
    return "Session error occurred";
  }
  return "An error occurred";
}
