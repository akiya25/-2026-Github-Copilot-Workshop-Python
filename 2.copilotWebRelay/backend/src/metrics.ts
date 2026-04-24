/**
 * メトリクス収集
 * 接続数、メッセージ数、エラー数をカウント
 */

export class Metrics {
  private connections = 0;
  private messages = 0;
  private errors = 0;
  private startTime = Date.now();

  recordConnection(): void {
    this.connections++;
  }

  recordDisconnection(): void {
    this.connections--;
  }

  recordMessage(): void {
    this.messages++;
  }

  recordError(): void {
    this.errors++;
  }

  getMetrics() {
    return {
      activeConnections: this.connections,
      totalMessages: this.messages,
      totalErrors: this.errors,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
    };
  }
}

export const metrics = new Metrics();
