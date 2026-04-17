/**
 * Flask API クライアント
 * Phase 5: バックエンド API 連携
 */

export class ApiClient {
  async getStatsToday() {
    const response = await fetch('/api/stats/today');
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.status}`);
    }
    return response.json();
  }

  async createSession(mode, duration, completedAt) {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        mode,
        duration,
        completed: true,
        completedAt
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status}`);
    }

    return response.json();
  }

  async resetToday() {
    const response = await fetch('/api/reset-today', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Failed to reset stats: ${response.status}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
