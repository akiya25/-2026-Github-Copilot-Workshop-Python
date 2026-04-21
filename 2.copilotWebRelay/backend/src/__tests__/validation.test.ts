/**
 * Validation テスト
 */

import {
  validateMessage,
  validateOrigin,
  validateToken,
} from "../validation";
import { ValidationError } from "../types";

describe("Validation", () => {
  describe("validateMessage", () => {
    it("should parse valid chat message", () => {
      const result = validateMessage(JSON.stringify({ type: "chat", content: "hello" }));
      expect(result.type).toBe("chat");
      expect(result.content).toBe("hello");
    });

    it("should reject invalid JSON", () => {
      expect(() => validateMessage("invalid json")).toThrow(ValidationError);
    });

    it("should reject missing content", () => {
      expect(() => validateMessage(JSON.stringify({ type: "chat" }))).toThrow(
        ValidationError
      );
    });

    it("should reject empty content", () => {
      expect(() => validateMessage(JSON.stringify({ type: "chat", content: "" }))).toThrow(
        ValidationError
      );
    });

    it("should reject oversized message", () => {
      const largeContent = "x".repeat(5000);
      expect(() =>
        validateMessage(JSON.stringify({ type: "chat", content: largeContent }))
      ).toThrow(ValidationError);
    });

    it("should accept ping message", () => {
      const result = validateMessage(JSON.stringify({ type: "ping" }));
      expect(result.type).toBe("ping");
    });

    it("should reject unknown message type", () => {
      expect(() => validateMessage(JSON.stringify({ type: "unknown" }))).toThrow(
        ValidationError
      );
    });
  });

  describe("validateOrigin", () => {
    it("should accept whitelisted origin", () => {
      const result = validateOrigin("http://localhost:5173", [
        "http://localhost:5173",
      ]);
      expect(result).toBe(true);
    });

    it("should reject non-whitelisted origin", () => {
      const result = validateOrigin("http://malicious.com", [
        "http://localhost:5173",
      ]);
      expect(result).toBe(false);
    });

    it("should handle wildcard origin", () => {
      const result = validateOrigin("http://any.com", ["*"]);
      expect(result).toBe(true);
    });

    it("should reject undefined origin", () => {
      const result = validateOrigin(undefined, ["http://localhost:5173"]);
      expect(result).toBe(false);
    });
  });

  describe("validateToken", () => {
    it("should accept valid token format", () => {
      const result = validateToken("token_abcd1234abcd1234");
      expect(result).toBe(true);
    });

    it("should reject short token", () => {
      const result = validateToken("short");
      expect(result).toBe(false);
    });

    it("should reject undefined token", () => {
      const result = validateToken(undefined);
      expect(result).toBe(false);
    });
  });
});
