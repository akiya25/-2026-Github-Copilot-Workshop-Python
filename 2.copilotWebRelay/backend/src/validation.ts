/**
 * 入力値検証関数
 * JSON 攻撃、バッファオーバーフロー、不正な値を防止
 */

import { ChatMessage, ValidationError } from "./types";

// 最大メッセージサイズ（バッファオーバーフロー対策）
const MAX_MESSAGE_SIZE = 4096;
const MAX_MESSAGE_CONTENT_LENGTH = 2000;

/**
 * JSON パースと基本検証
 */
export function validateMessage(data: string): ChatMessage {
  try {
    // サイズチェック
    if (data.length > MAX_MESSAGE_SIZE) {
      throw new ValidationError(
        `Message exceeds maximum size of ${MAX_MESSAGE_SIZE} bytes`
      );
    }

    // JSON パース
    let msg: any;
    try {
      msg = JSON.parse(data);
    } catch {
      throw new ValidationError("Invalid JSON format");
    }

    // 型チェック
    if (!msg || typeof msg !== "object") {
      throw new ValidationError("Message must be an object");
    }

    // type フィールド検証
    if (!msg.type || typeof msg.type !== "string") {
      throw new ValidationError("Missing or invalid 'type' field");
    }

    // type が許可リストにあるかチェック
    const allowedTypes = ["chat", "ping"];
    if (!allowedTypes.includes(msg.type)) {
      throw new ValidationError(`Invalid message type: ${msg.type}`);
    }

    // type === "chat" の場合、content を検証
    if (msg.type === "chat") {
      if (msg.content === undefined) {
        throw new ValidationError("Missing 'content' field for chat message");
      }

      if (typeof msg.content !== "string") {
        throw new ValidationError("'content' must be a string");
      }

      if (msg.content.length === 0) {
        throw new ValidationError("'content' cannot be empty");
      }

      if (msg.content.length > MAX_MESSAGE_CONTENT_LENGTH) {
        throw new ValidationError(
          `'content' exceeds maximum length of ${MAX_MESSAGE_CONTENT_LENGTH} characters`
        );
      }

      // 危険な文字列パターンをチェック（簡易的な例）
      if (containsSuspiciousPatterns(msg.content)) {
        throw new ValidationError("Message contains suspicious patterns");
      }
    }

    return msg as ChatMessage;
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    throw new ValidationError(`Validation failed: ${String(err)}`);
  }
}

/**
 * 危険なパターンをチェック（簡易版）
 * 本番環境ではより厳格な検証が必要
 */
function containsSuspiciousPatterns(content: string): boolean {
  // ヌルバイトチェック
  if (content.includes("\x00")) {
    return true;
  }

  // 制御文字チェック（改行とタブを除く）
  if (/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/.test(content)) {
    return true;
  }

  return false;
}

/**
 * Origin ヘッダーの検証
 */
export function validateOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  if (!origin) {
    return false;
  }

  return allowedOrigins.some((allowed) => {
    // ワイルドカード対応（※本番環境では厳格に）
    if (allowed === "*") {
      return true;
    }

    // 正確なマッチング
    return origin === allowed;
  });
}

/**
 * トークン形式の検証（基本的なチェック）
 */
export function validateToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  // 基本的な形式チェック: "token_xxx" か "gh_xxx" のようなパターン
  if (!/^[a-zA-Z0-9_\-]{20,}$/.test(token)) {
    return false;
  }

  return true;
}
