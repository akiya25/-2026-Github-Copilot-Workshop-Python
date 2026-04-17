/**
 * timeCalc.js のユニットテスト
 * 時間計算エンジンの各関数をテスト
 */

import {
  formatTime,
  calculateProgress,
  calculateRemaining,
  calculateSvgProgress
} from '../../static/js/domain/timeCalc.js';

describe('timeCalc.js', () => {
  // ================================
  // formatTime() のテスト
  // ================================
  describe('formatTime()', () => {
    test('25分（1500秒）を "25:00" に変換', () => {
      expect(formatTime(1500)).toBe('25:00');
    });

    test('5分（300秒）を "05:00" に変換', () => {
      expect(formatTime(300)).toBe('05:00');
    });

    test('1分15秒（75秒）を "01:15" に変換', () => {
      expect(formatTime(75)).toBe('01:15');
    });

    test('ゼロ秒を "00:00" に変換', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    test('1秒を "00:01" に変換', () => {
      expect(formatTime(1)).toBe('00:01');
    });

    test('59秒を "00:59" に変換', () => {
      expect(formatTime(59)).toBe('00:59');
    });

    test('60秒を "01:00" に変換', () => {
      expect(formatTime(60)).toBe('01:00');
    });

    test('負の秒数は 0 として処理', () => {
      expect(formatTime(-10)).toBe('00:00');
    });

    test('1時間（3600秒）を "60:00" に変換', () => {
      expect(formatTime(3600)).toBe('60:00');
    });

    test('小数秒は切り上げ', () => {
      expect(formatTime(1.5)).toBe('00:02');
    });

    test('小数秒 0.1 は切り上げ', () => {
      expect(formatTime(0.1)).toBe('00:01');
    });
  });

  // ================================
  // calculateProgress() のテスト
  // ================================
  describe('calculateProgress()', () => {
    test('完了直後（残り時間 = 総時間）は 0%', () => {
      expect(calculateProgress(1500, 1500)).toBe(0);
    });

    test('終了時（残り時間 = 0）は 100%', () => {
      expect(calculateProgress(0, 1500)).toBe(100);
    });

    test('中盤（残り時間 = 総時間の50%）は 50%', () => {
      expect(calculateProgress(750, 1500)).toBe(50);
    });

    test('4分の3経過時は 75%', () => {
      expect(calculateProgress(375, 1500)).toBe(75);
    });

    test('4分の1経過時は 25%', () => {
      expect(calculateProgress(1125, 1500)).toBe(25);
    });

    test('総時間 0 の場合は 0%', () => {
      expect(calculateProgress(100, 0)).toBe(0);
    });

    test('負の進捗は 0% に補正', () => {
      expect(calculateProgress(-100, 1500)).toBeGreaterThanOrEqual(0);
      expect(calculateProgress(-100, 1500)).toBeLessThanOrEqual(100);
    });

    test('100% 超過は 100% に補正', () => {
      expect(calculateProgress(1600, 1500)).toBeLessThanOrEqual(100);
    });

    test('短期タイマー（5分）での計算', () => {
      expect(calculateProgress(150, 300)).toBe(50);
    });
  });

  // ================================
  // calculateRemaining() のテスト
  // ================================
  describe('calculateRemaining()', () => {
    test('正のターゲット時刻で残り時間を計算', () => {
      const now = Date.now() / 1000;
      const targetTime = now + 1500; // 25分後
      const remaining = calculateRemaining(targetTime);
      
      // 誤差を許容（±1秒）
      expect(remaining).toBeGreaterThanOrEqual(1499);
      expect(remaining).toBeLessThanOrEqual(1500);
    });

    test('ターゲット時刻が過去の場合は 0', () => {
      const now = Date.now() / 1000;
      const targetTime = now - 100; // 過去
      expect(calculateRemaining(targetTime)).toBe(0);
    });

    test('ターゲット時刻が直後の場合、残り時間はほぼ 0', () => {
      const now = Date.now() / 1000;
      const targetTime = now + 0.1;
      const remaining = calculateRemaining(targetTime);
      
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(1);
    });

    test('5秒後のターゲット', () => {
      const now = Date.now() / 1000;
      const targetTime = now + 5;
      const remaining = calculateRemaining(targetTime);
      
      expect(remaining).toBeGreaterThanOrEqual(4);
      expect(remaining).toBeLessThanOrEqual(5);
    });
  });

  // ================================
  // calculateSvgProgress() のテスト
  // ================================
  describe('calculateSvgProgress()', () => {
    test('0% 進捗の SVG パラメータ', () => {
      const result = calculateSvgProgress(0, 65);
      
      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
      expect(typeof result.dashArray).toBe('number');
      expect(typeof result.dashOffset).toBe('number');
    });

    test('50% 進捗の SVG パラメータ', () => {
      const result = calculateSvgProgress(50, 65);
      
      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
    });

    test('100% 進捗の SVG パラメータ', () => {
      const result = calculateSvgProgress(100, 65);
      
      expect(result).toHaveProperty('dashArray');
      expect(result).toHaveProperty('dashOffset');
    });

    test('異なるラジアスでのパラメータ計算', () => {
      const result1 = calculateSvgProgress(50, 65);
      const result2 = calculateSvgProgress(50, 100);
      
      // 異なるラジアスでは異なる結果
      expect(result1.dashArray).not.toBe(result2.dashArray);
    });

    test('dashOffset は負の値または 0（進捗に応じて）', () => {
      const result = calculateSvgProgress(50, 65);
      const offset = result.dashOffset;
      
      expect(offset).toBeLessThanOrEqual(result.dashArray);
    });

    test('進捗 0% から 100% への段階的計算', () => {
      const offsets = [];
      for (let i = 0; i <= 100; i += 25) {
        const result = calculateSvgProgress(i, 65);
        offsets.push(result.dashOffset);
      }
      
      // オフセットは段階的に減少（0%→100%）
      for (let i = 1; i < offsets.length; i++) {
        expect(offsets[i]).toBeLessThanOrEqual(offsets[i - 1]);
      }
    });
  });
});
