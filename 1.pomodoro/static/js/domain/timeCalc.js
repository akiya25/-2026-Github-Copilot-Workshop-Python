/**
 * 時間計算エンジン
 * タイマーの時間計算と時間フォーマット処理
 */

/**
 * 秒数を "mm:ss" 形式に変換
 * @param {number} seconds - 秒数
 * @returns {string} "mm:ss" フォーマット文字列
 * @example
 * formatTime(1500) // "25:00"
 * formatTime(75)   // "01:15"
 * formatTime(0)    // "00:00"
 */
export function formatTime(seconds) {
  const totalSeconds = Math.ceil(Math.max(0, seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * 進捗率を計算
 * 残り時間 / 総時間 の比率で 0～100% を返す
 * @param {number} remaining - 残り時間（秒）
 * @param {number} total - 総時間（秒）
 * @returns {number} 進捗率（0～100%）
 * @example
 * calculateProgress(1500, 1500) // 0 (開始直後)
 * calculateProgress(750, 1500)  // 50 (中盤)
 * calculateProgress(0, 1500)    // 100 (完了)
 */
export function calculateProgress(remaining, total) {
  if (total === 0) return 0;
  const ratio = remaining / total;
  return Math.max(0, Math.min(100, (1 - ratio) * 100));
}

/**
 * 残り時間を計算（ドリフト対応）
 * 現在時刻ベースで計算し、タブ非アクティブ時のドリフトを抑制
 * @param {number} targetTime - 終了予定時刻（UNIX timestamp）
 * @returns {number} 残り時間（秒）。負数は0に
 * @example
 * // 現在: 14:00、終了予定: 14:25
 * calculateRemaining(1234567890) // 1500 (25分)
 */
export function calculateRemaining(targetTime) {
  const now = Date.now() / 1000;
  return Math.max(0, targetTime - now);
}

/**
 * SVG 円形プログレス用のストロークオフセット計算
 * @param {number} progress - 進捗率（0～100%）
 * @param {number} radius - 円の半径（デフォルト 130px）
 * @returns {object} SVG更新用パラメータ
 * @example
 * calculateSvgProgress(50, 130)
 * // { dashArray: 816.81, dashOffset: 408.4 }
 */
export function calculateSvgProgress(progress, radius = 130) {
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress / 100);

  return {
    dashArray: circumference,
    dashOffset: dashOffset
  };
}
