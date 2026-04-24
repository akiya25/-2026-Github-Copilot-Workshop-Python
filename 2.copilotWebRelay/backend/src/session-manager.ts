/**
 * セッション管理
 * クライアント接続とセッションをMap で一元管理
 */

import { CopilotSessionType, ClientConnection } from "./types";
import { logger } from "./logger";

export class SessionManager {
  private sessions = new Map<string, ClientConnection>();

  set(clientId: string, connection: ClientConnection): void {
    this.sessions.set(clientId, connection);
    logger.debug("Session created", { clientId, total: this.sessions.size });
  }

  get(clientId: string): ClientConnection | undefined {
    return this.sessions.get(clientId);
  }

  has(clientId: string): boolean {
    return this.sessions.has(clientId);
  }

  delete(clientId: string): void {
    this.sessions.delete(clientId);
    logger.debug("Session deleted", { clientId, total: this.sessions.size });
  }

  size(): number {
    return this.sessions.size;
  }

  getAll(): ClientConnection[] {
    return Array.from(this.sessions.values());
  }

  async closeAll(): Promise<void> {
    logger.info("Closing all sessions", { count: this.sessions.size });

    for (const [clientId, conn] of this.sessions.entries()) {
      try {
        if (conn.session) {
          await conn.session.disconnect().catch(() => {
            // 既に切断の可能性あり
          });
        }
        if (conn.ws && conn.ws.readyState === conn.ws.OPEN) {
          conn.ws.close();
        }
      } catch (err) {
        logger.debug("Error closing session", { clientId });
      }
    }

    this.sessions.clear();
  }
}

export const sessionManager = new SessionManager();
