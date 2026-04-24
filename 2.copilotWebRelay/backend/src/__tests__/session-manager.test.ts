/**
 * SessionManager テスト
 */

import { SessionManager } from "../session-manager";
import { ClientConnection } from "../types";

describe("SessionManager", () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  it("should set and get connection", () => {
    const conn: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-1",
      connectedAt: new Date(),
    };

    manager.set("test-client-1", conn);
    const retrieved = manager.get("test-client-1");

    expect(retrieved).toBe(conn);
  });

  it("should check if connection exists", () => {
    const conn: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-1",
      connectedAt: new Date(),
    };

    manager.set("test-client-1", conn);
    expect(manager.has("test-client-1")).toBe(true);
    expect(manager.has("non-existent")).toBe(false);
  });

  it("should delete connection", () => {
    const conn: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-1",
      connectedAt: new Date(),
    };

    manager.set("test-client-1", conn);
    manager.delete("test-client-1");

    expect(manager.has("test-client-1")).toBe(false);
  });

  it("should return correct size", () => {
    const conn1: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-1",
      connectedAt: new Date(),
    };
    const conn2: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-2",
      connectedAt: new Date(),
    };

    manager.set("test-client-1", conn1);
    manager.set("test-client-2", conn2);

    expect(manager.size()).toBe(2);
  });

  it("should get all connections", () => {
    const conn1: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-1",
      connectedAt: new Date(),
    };
    const conn2: ClientConnection = {
      ws: {} as any,
      session: null,
      clientId: "test-client-2",
      connectedAt: new Date(),
    };

    manager.set("test-client-1", conn1);
    manager.set("test-client-2", conn2);

    const all = manager.getAll();
    expect(all.length).toBe(2);
    expect(all).toContain(conn1);
    expect(all).toContain(conn2);
  });
});
