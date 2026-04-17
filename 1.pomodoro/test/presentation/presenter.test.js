/**
 * presenter.js のユニットテスト
 * プレゼンテーション層（表示ロジック）のテスト
 */

import {
  renderTime,
  renderStatus,
  renderProgressRing,
  renderDailyStats,
  renderButtonStates
} from '../../static/js/presentation/presenter.js';

describe('presenter.js', () => {
  // ================================
  // renderTime() のテスト
  // ================================
  describe('renderTime()', () => {
    test('1500秒（25分）を "25:00" に表示', () => {
      expect(renderTime(1500)).toBe('25:00');
    });

    test('300秒（5分）を "05:00" に表示', () => {
      expect(renderTime(300)).toBe('05:00');
    });

    test('0秒を "00:00" に表示', () => {
      expect(renderTime(0)).toBe('00:00');
    });

    test('75秒（1分15秒）を "01:15" に表示', () => {
      expect(renderTime(75)).toBe('01:15');
    });
  });

  // ================================
  // renderStatus() のテスト
  // ================================
  describe('renderStatus()', () => {
    test('running と focus で "作業中" を返す', () => {
      expect(renderStatus('running', 'focus')).toBe('作業中');
    });

    test('running と short_break で "短休憩中" を返す', () => {
      expect(renderStatus('running', 'short_break')).toBe('短休憩中');
    });

    test('running と long_break で "長休憩中" を返す', () => {
      expect(renderStatus('running', 'long_break')).toBe('長休憩中');
    });

    test('paused と focus で "一時停止中（作業）" を返す', () => {
      expect(renderStatus('paused', 'focus')).toBe('一時停止中（作業）');
    });

    test('paused と short_break で "一時停止中（休憩）" を返す', () => {
      expect(renderStatus('paused', 'short_break')).toBe('一時停止中（休憩）');
    });

    test('idle で "未開始" を返す', () => {
      expect(renderStatus('idle', 'focus')).toBe('未開始');
    });

    test('finished と focus で "作業完了" を返す', () => {
      expect(renderStatus('finished', 'focus')).toBe('作業完了');
    });

    test('finished と short_break で "休憩完了" を返す', () => {
      expect(renderStatus('finished', 'short_break')).toBe('休憩完了');
    });

    test('incorrect status は "未知の状態" を返す', () => {
      expect(renderStatus('invalid', 'focus')).toBe('未知の状態');
    });
  });

  // ================================
  // renderProgressRing() のテスト
  // ================================
  describe('renderProgressRing()', () => {
    test('進捗 0% のリング情報を返す', () => {
      const result = renderProgressRing(1500, 1500);

      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
      expect(typeof result.dashArray).toBe('number');
      expect(typeof result.dashOffset).toBe('number');
    });

    test('進捗 50% のリング情報を返す', () => {
      const result = renderProgressRing(750, 1500);

      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
    });

    test('進捗 100% のリング情報を返す', () => {
      const result = renderProgressRing(0, 1500);

      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
    });

    test('短時間（5分）での進捗リング計算', () => {
      const result = renderProgressRing(150, 300);

      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
    });
  });

  // ================================
  // renderDailyStats() のテスト
  // ================================
  describe('renderDailyStats()', () => {
    test('セッション数 0、集中時間 0分の統計', () => {
      const stats = renderDailyStats(0, 0);

      expect(stats).toHaveProperty('completedSessions');
      expect(stats).toHaveProperty('focusTimeDisplay');
      expect(stats.completedSessions).toBe(0);
      expect(stats.focusTimeDisplay).toBe('0');
    });

    test('セッション数 1, 25分の統計', () => {
      const stats = renderDailyStats(1, 25);

      expect(stats.completedSessions).toBe(1);
      expect(stats.focusTimeDisplay).toBe('25');
    });

    test('セッション数 2, 50分の統計', () => {
      const stats = renderDailyStats(2, 50);

      expect(stats.completedSessions).toBe(2);
      expect(stats.focusTimeDisplay).toBe('50');
    });

    test('セッション数 3, 60分の統計（1:00）', () => {
      const stats = renderDailyStats(3, 60);

      expect(stats.completedSessions).toBe(3);
      expect(stats.focusTimeDisplay).toBe('1:00');
    });

    test('セッション数 3, 75分の統計（1:15）', () => {
      const stats = renderDailyStats(3, 75);

      expect(stats.completedSessions).toBe(3);
      expect(stats.focusTimeDisplay).toBe('1:15');
    });

    test('セッション数 4, 100分の統計（1:40）', () => {
      const stats = renderDailyStats(4, 100);

      expect(stats.completedSessions).toBe(4);
      expect(stats.focusTimeDisplay).toBe('1:40');
    });

    test('1時間45分（105分）のフォーマット', () => {
      const stats = renderDailyStats(4, 105);

      expect(stats.completedSessions).toBe(4);
      expect(stats.focusTimeDisplay).toBe('1:45');
    });

    test('2時間30分（150分）のフォーマット', () => {
      const stats = renderDailyStats(6, 150);

      expect(stats.completedSessions).toBe(6);
      expect(stats.focusTimeDisplay).toBe('2:30');
    });

    test('0時間15分（15分）は "15" と表示', () => {
      const stats = renderDailyStats(0, 15);

      expect(stats.focusTimeDisplay).toBe('15');
    });
  });

  // ================================
  // renderButtonStates() のテスト
  // ================================
  describe('renderButtonStates()', () => {
    test('idle 状態でのボタン表示', () => {
      const states = renderButtonStates('idle');

      expect(states.startBtn).toBe(true);
      expect(states.pauseBtn).toBe(false);
      expect(states.resumeBtn).toBe(false);
      expect(states.resetBtn).toBe(false);
    });

    test('running 状態でのボタン表示', () => {
      const states = renderButtonStates('running');

      expect(states.startBtn).toBe(false);
      expect(states.pauseBtn).toBe(true);
      expect(states.resumeBtn).toBe(false);
      expect(states.resetBtn).toBe(true);
    });

    test('paused 状態でのボタン表示', () => {
      const states = renderButtonStates('paused');

      expect(states.startBtn).toBe(false);
      expect(states.pauseBtn).toBe(false);
      expect(states.resumeBtn).toBe(true);
      expect(states.resetBtn).toBe(true);
    });

    test('finished 状態でのボタン表示（resetBtn = true）', () => {
      const states = renderButtonStates('finished');

      expect(states.startBtn).toBe(true);
      expect(states.pauseBtn).toBe(false);
      expect(states.resumeBtn).toBe(false);
      expect(states.resetBtn).toBe(true);
    });

    test('不正なステータスでもresetBtn = true（idle以外）', () => {
      const states = renderButtonStates('invalid');

      expect(states.startBtn).toBe(false);
      expect(states.pauseBtn).toBe(false);
      expect(states.resumeBtn).toBe(false);
      expect(states.resetBtn).toBe(true);
    });

    test('すべてのボタン状態は boolean 値', () => {
      const states = renderButtonStates('running');

      Object.values(states).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  // ================================
  // 統合テスト（複数のプレゼンター関数）
  // ================================
  describe('統合テスト', () => {
    test('完全なセッション進捗を表示', () => {
      // 開始時
      const timeDisplay1 = renderTime(1500);
      const statusDisplay1 = renderStatus('idle', 'focus');
      const stats1 = renderDailyStats(0, 0);
      const btns1 = renderButtonStates('idle');

      expect(timeDisplay1).toBe('25:00');
      expect(statusDisplay1).toBe('未開始');
      expect(stats1.completedSessions).toBe(0);
      expect(btns1.startBtn).toBe(true);

      // 実行中（10分経過）
      const timeDisplay2 = renderTime(900);
      const statusDisplay2 = renderStatus('running', 'focus');
      const btns2 = renderButtonStates('running');

      expect(timeDisplay2).toBe('15:00');
      expect(statusDisplay2).toBe('作業中');
      expect(btns2.pauseBtn).toBe(true);

      // 一時停止
      const statusDisplay3 = renderStatus('paused', 'focus');
      const btns3 = renderButtonStates('paused');

      expect(statusDisplay3).toBe('一時停止中（作業）');
      expect(btns3.resumeBtn).toBe(true);

      // 完了
      const statusDisplay4 = renderStatus('finished', 'focus');
      const stats4 = renderDailyStats(1, 25);

      expect(statusDisplay4).toBe('作業完了');
      expect(stats4.completedSessions).toBe(1);
    });

    test('複数セッションの統計表示', () => {
      // 1セッション目：25分
      let stats = renderDailyStats(1, 25);
      expect(stats.focusTimeDisplay).toBe('25');

      // 2セッション目：50分
      stats = renderDailyStats(2, 50);
      expect(stats.focusTimeDisplay).toBe('50');

      // 3セッション目：75分→1:15
      stats = renderDailyStats(3, 75);
      expect(stats.focusTimeDisplay).toBe('1:15');

      // 4セッション目：100分→1:40
      stats = renderDailyStats(4, 100);
      expect(stats.focusTimeDisplay).toBe('1:40');

      // 5セッション目：125分→2:05
      stats = renderDailyStats(5, 125);
      expect(stats.focusTimeDisplay).toBe('2:05');
    });
  });
});
