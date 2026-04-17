/**
 * Presenter層（表示ロジック）
 * 状態からUI表示用データへの変換（純粋関数）
 */
import { formatTime, calculateProgress, calculateSvgProgress } from '../domain/timeCalc.js';

/**
 * 時間表示を生成
 * @param {number} seconds - 秒数
 * @returns {string} "mm:ss" フォーマット
 */
export function renderTime(seconds) {
  return formatTime(seconds);
}

/**
 * SVG進捗リング用のデータを生成
 * @param {number} remaining - 残り時間（秒）
 * @param {number} total - 総時間（秒）
 * @returns {object} SVG更新パラメータ
 */
export function renderProgressRing(remaining, total) {
  const progress = calculateProgress(remaining, total);
  return calculateSvgProgress(progress, 130);
}

/**
 * ステータスラベルを生成
 * @param {string} status - ステータス（idle/running/paused/finished）
 * @param {string} mode - モード（focus/short_break/long_break）
 * @returns {string} 日本語ステータステキスト
 */
export function renderStatus(status, mode) {
  const messages = {
    'idle': '未開始',
    'running_focus': '作業中',
    'running_short_break': '短休憩中',
    'running_long_break': '長休憩中',
    'paused_focus': '一時停止中（作業）',
    'paused_short_break': '一時停止中（休憩）',
    'paused_long_break': '一時停止中（長休憩）',
    'finished_focus': '作業完了',
    'finished_short_break': '休憩完了',
    'finished_long_break': '長休憩完了'
  };

  if (status === 'running' || status === 'paused' || status === 'finished') {
    const key = `${status}_${mode}`;
    return messages[key] || '未知の状態';
  }

  return messages[status] || '未知の状態';
}

/**
 * 日次統計データを生成
 * @param {number} completed - 完了セッション数
 * @param {number} focusMinutes - 集中時間（分）
 * @returns {object} 表示用統計データ
 */
export function renderDailyStats(completed, focusMinutes) {
  const hours = Math.floor(focusMinutes / 60);
  const mins = focusMinutes % 60;
  
  let timeStr;
  if (hours > 0) {
    timeStr = `${hours}:${String(mins).padStart(2, '0')}`;
  } else {
    timeStr = `${Math.floor(mins)}`;
  }

  return {
    completedSessions: completed,
    focusTimeDisplay: timeStr
  };
}

/**
 * ボタン状態を生成
 * @param {string} status - ステータス
 * @returns {object} 各ボタンの有効/無効フラグ
 */
export function renderButtonStates(status) {
  return {
    startBtn: status === 'idle' || status === 'finished',
    pauseBtn: status === 'running',
    resumeBtn: status === 'paused',
    resetBtn: status !== 'idle'  // idle 以外で有効
  };
}
