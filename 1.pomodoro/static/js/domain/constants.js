/**
 * ポモドーロタイマー 定数定義
 * Phase 0: プロジェクト初期化
 */

// タイマーモード定義
export const TIMER_MODES = {
  FOCUS: {
    key: 'focus',
    label: '集中',
    labelJa: '作業中',
    time: 25 * 60,  // 25分をセカンドで
    breakAfter: null  // 4セッション後に長休憩
  },
  SHORT_BREAK: {
    key: 'short_break',
    label: '短休憩',
    labelJa: '休憩中',
    time: 5 * 60,  // 5分をセカンドで
    breakAfter: null
  },
  LONG_BREAK: {
    key: 'long_break',
    label: '長休憩',
    labelJa: '長休憩中',
    time: 15 * 60,  // 15分をセカンドで
    breakAfter: null
  }
};

// タイマー状態
export const TIMER_STATES = {
  IDLE: 'idle',          // 未開始
  RUNNING: 'running',    // 実行中
  PAUSED: 'paused',      // 一時停止
  FINISHED: 'finished'   // 完了
};

// タイマーアクション型
export const TIMER_ACTIONS = {
  START: 'START',
  PAUSE: 'PAUSE',
  RESUME: 'RESUME',
  RESET: 'RESET',
  TICK: 'TICK',
  COMPLETE: 'COMPLETE',
  SWITCH_MODE: 'SWITCH_MODE'
};

// ローカルストレージキー
export const STORAGE_KEYS = {
  SESSIONS_TODAY: 'sessions_today',
  TIMER_SETTINGS: 'timer_settings',
  LAST_SYNC_AT: 'last_sync_at'
};

// 通知関連
export const NOTIFICATION_TYPES = {
  FOCUS_COMPLETE: 'focus_complete',
  BREAK_COMPLETE: 'break_complete',
  LONG_BREAK_COMPLETE: 'long_break_complete'
};

// 通知メッセージ
export const NOTIFICATION_MESSAGES = {
  focus_complete: {
    title: 'ポモドーロタイマー',
    body: '作業セッションが終了しました。休憩を始めてください。'
  },
  short_break_complete: {
    title: 'ポモドーロタイマー',
    body: '休憩時間が終了しました。次のセッションを開始してください。'
  },
  long_break_complete: {
    title: 'ポモドーロタイマー',
    body: '長休憩が終了しました。準備はいいですか？'
  }
};

// デバッグモード
export const DEBUG = false;

// ログユーティリティ
export const log = (message, ...args) => {
  if (DEBUG) {
    console.log(`[PomodoroTimer] ${message}`, ...args);
  }
};
