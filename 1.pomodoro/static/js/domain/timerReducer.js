/**
 * タイマー状態管理（ステートマシン）
 * ポモドーロタイマーの状態遷移を管理する Reducer パターン実装
 */
import { TIMER_MODES, TIMER_STATES, TIMER_ACTIONS } from './constants.js';

/**
 * 初期状態
 */
export const initialState = {
  status: TIMER_STATES.IDLE,        // 未開始
  mode: 'focus',                    // モード: focus
  currentTime: TIMER_MODES.FOCUS.time,  // 残り時間（秒）
  targetTime: null,                 // 終了予定時刻（UNIX timestamp）
  totalSessions: 0                  // 今日のセッション数
};

/**
 * タイマーの時間定義を取得
 * @param {string} mode - モード（focus / short_break / long_break）
 * @returns {number} 時間（秒）
 */
function getTimerDuration(mode) {
  const durations = {
    'focus': TIMER_MODES.FOCUS.time,
    'short_break': TIMER_MODES.SHORT_BREAK.time,
    'long_break': TIMER_MODES.LONG_BREAK.time
  };
  return durations[mode] || TIMER_MODES.FOCUS.time;
}

/**
 * 次のモードを決定
 * focus → short_break → focus (long_break は省略)
 * @param {string} currentMode - 現在のモード
 * @returns {string} 次のモード
 */
function getNextMode(currentMode) {
  const modeSequence = ['focus', 'short_break'];
  const currentIndex = modeSequence.indexOf(currentMode);
  const nextIndex = (currentIndex + 1) % modeSequence.length;
  return modeSequence[nextIndex];
}

/**
 * ステートマシン: (state, action) => newState
 * @param {object} state - 現在の状態
 * @param {object} action - アクション（type は必須）
 * @returns {object} 新しい状態
 */
export function timerReducer(state = initialState, action = {}) {
  const { type, now = Date.now() / 1000 } = action;

  switch (type) {
    // ============================================
    // ▶ START: idle または finished → running に遷移
    // ============================================
    case TIMER_ACTIONS.START:
      if (state.status !== TIMER_STATES.IDLE && state.status !== TIMER_STATES.FINISHED) {
        console.warn('[timerReducer] Invalid state transition: START only allowed from idle/finished');
        return state;
      }
      return {
        ...state,
        status: TIMER_STATES.RUNNING,
        targetTime: now + state.currentTime
      };

    // ============================================
    // ⏸ PAUSE: running → paused に遷移
    // ============================================
    case TIMER_ACTIONS.PAUSE:
      if (state.status !== TIMER_STATES.RUNNING) {
        console.warn('[timerReducer] Invalid state transition: PAUSE only allowed from running');
        return state;
      }
      return {
        ...state,
        status: TIMER_STATES.PAUSED
      };

    // ============================================
    // ▶ RESUME: paused → running に遷移
    // ============================================
    case TIMER_ACTIONS.RESUME:
      if (state.status !== TIMER_STATES.PAUSED) {
        console.warn('[timerReducer] Invalid state transition: RESUME only allowed from paused');
        return state;
      }
      return {
        ...state,
        status: TIMER_STATES.RUNNING,
        targetTime: now + state.currentTime
      };

    // ============================================
    // ⟲ RESET: 任意の状態 → idle に遷移
    // ============================================
    case TIMER_ACTIONS.RESET:
      return {
        ...initialState
      };

    // ============================================
    // ⏱ TICK: running状態での時間更新（毎フレーム実行）
    // ============================================
    case TIMER_ACTIONS.TICK:
      if (state.status !== TIMER_STATES.RUNNING) {
        return state;
      }
      // remaining = targetTime - now
      const remaining = Math.max(0, state.targetTime - now);
      return {
        ...state,
        currentTime: remaining
      };

    // ============================================
    // ✓ COMPLETE: running → finished に遷移（タイムアップ）
    // ============================================
    case TIMER_ACTIONS.COMPLETE:
      const nextMode = getNextMode(state.mode);
      const nextModeTime = getTimerDuration(nextMode);

      return {
        ...state,
        status: TIMER_STATES.FINISHED,
        mode: nextMode,
        currentTime: nextModeTime,
        targetTime: null,
        // focusモードのセッションのみカウント
        totalSessions: state.mode === 'focus' ? state.totalSessions + 1 : state.totalSessions
      };

    // ============================================
    // Default: 不正なアクション
    // ============================================
    default:
      console.warn('[timerReducer] Unknown action type:', type);
      return state;
  }
}
