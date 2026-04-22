/**
 * handlers テスト
 * イベントリスナー管理と削除、クリーンアップ機構を検証
 */

import { setupSessionEventHandlers, handleClose } from "../handlers";
import { CopilotSessionType } from "../types";

describe("setupSessionEventHandlers", () => {
  let mockSession: any;
  let mockWs: any;
  let handlers: any;

  beforeEach(() => {
    mockSession = {
      on: jest.fn(),
      removeListener: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    mockWs = {
      readyState: 1, // OPEN
      send: jest.fn(),
    };
  });

  it("should register event listeners on setup", () => {
    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    expect(mockSession.on).toHaveBeenCalledTimes(3);
    expect(mockSession.on).toHaveBeenCalledWith(
      "assistant.message_delta",
      expect.any(Function)
    );
    expect(mockSession.on).toHaveBeenCalledWith(
      "session.idle",
      expect.any(Function)
    );
    expect(mockSession.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("should return cleanup function that removes all listeners", () => {
    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    handlers.cleanup();

    expect(mockSession.removeListener).toHaveBeenCalledTimes(3);
    expect(mockSession.removeListener).toHaveBeenCalledWith(
      "assistant.message_delta",
      expect.any(Function)
    );
    expect(mockSession.removeListener).toHaveBeenCalledWith(
      "session.idle",
      expect.any(Function)
    );
    expect(mockSession.removeListener).toHaveBeenCalledWith(
      "error",
      expect.any(Function)
    );
  });

  it("should handle message delta events correctly", () => {
    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    // message_delta イベントを手動でトリガー
    const deltaHandler = mockSession.on.mock.calls[0][1];
    deltaHandler({ data: { deltaContent: "test content" } });

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "delta",
        content: "test content",
      })
    );
  });

  it("should handle session.idle events correctly", () => {
    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    // session.idle イベントをトリガー
    const idleHandler = mockSession.on.mock.calls[1][1];
    idleHandler();

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "done" })
    );
  });

  it("should send error message on session error", () => {
    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    // error イベントをトリガー
    const errorHandler = mockSession.on.mock.calls[2][1];
    errorHandler(new Error("test error"));

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: "error",
        message: "Session error occurred",
      })
    );
  });

  it("should not send message if WebSocket is closed", () => {
    mockWs.readyState = 3; // CLOSED

    handlers = setupSessionEventHandlers(mockSession, mockWs, "test-client");

    const deltaHandler = mockSession.on.mock.calls[0][1];
    deltaHandler({ data: { deltaContent: "test content" } });

    expect(mockWs.send).not.toHaveBeenCalled();
  });
});

describe("handleClose", () => {
  let mockSession: any;
  let mockWs: any;
  let handlers: any;

  beforeEach(() => {
    mockSession = {
      on: jest.fn(),
      removeListener: jest.fn(),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    mockWs = {
      readyState: 1,
      send: jest.fn(),
    };

    handlers = {
      cleanup: jest.fn(),
      onMessageDelta: jest.fn(),
      onSessionIdle: jest.fn(),
      onSessionError: jest.fn(),
    };
  });

  it("should call cleanup handlers when session exists", async () => {
    await handleClose(mockSession, "test-client", handlers);

    expect(handlers.cleanup).toHaveBeenCalled();
  });

  it("should disconnect session", async () => {
    await handleClose(mockSession, "test-client", handlers);

    expect(mockSession.disconnect).toHaveBeenCalled();
  });

  it("should handle disconnect errors gracefully", async () => {
    mockSession.disconnect.mockRejectedValue(new Error("disconnect failed"));

    // Should not throw
    await expect(
      handleClose(mockSession, "test-client", handlers)
    ).resolves.not.toThrow();
  });

  it("should handle null session gracefully", async () => {
    // Should not throw
    await expect(
      handleClose(null, "test-client", handlers)
    ).resolves.not.toThrow();
  });

  it("should retry disconnect on first attempt failure", async () => {
    let callCount = 0;
    mockSession.disconnect.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("temporary failure"));
      }
      return Promise.resolve();
    });

    await handleClose(mockSession, "test-client", handlers);

    expect(mockSession.disconnect).toHaveBeenCalledTimes(2);
  });
});
