/**
 * ポモドーロタイマー メインアプリケーション
 * Phase 1A: タイマーコア機能
 * Phase 2: 完了処理 + 通知機能
 * Phase 3: localStorage 連携 + 日次統計
 */
import { initialState, timerReducer } from './domain/timerReducer.js';
import { TIMER_MODES, TIMER_STATES, TIMER_ACTIONS } from './domain/constants.js';
import { 
  renderTime, 
  renderStatus, 
  renderDailyStats, 
  renderButtonStates, 
  renderProgressRing 
} from './presentation/presenter.js';
import { view } from './presentation/view.js';
import {
  requestNotificationPermission,
  notifyCompletionFull
} from './infrastructure/notifier.js';
import { apiClient } from './infrastructure/apiClient.js';
import { sessionRepository } from './infrastructure/sessionRepository.js';

/**
 * ポモドーロタイマー アプリケーションクラス
 */
class TimerApp {
  constructor() {
    this.state = { ...initialState };
    this.animationId = null;
    this.startTime = null;
    this.dailyStats = sessionRepository.getTodayStats();
    this.apiClient = apiClient;

    // Notification API パーミッション要求
    requestNotificationPermission();

    // button setup と event listener setup
    this.setupUI();
    this.setupEventListeners();
    this.render();
    void this.syncStatsFromServer();

    console.log('[TimerApp] Application initialized');
  }

  /**
   * UI をセットアップ（ボタン追加など）
   */
  setupUI() {
    view.ensurePauseButton();
    view.ensureResumeButton();
  }

  /**
   * イベントリスナーをセットアップ
   */
  setupEventListeners() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => this.start());
    }
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => this.pause());
    }
    if (resumeBtn) {
      resumeBtn.addEventListener('click', () => this.resume());
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.reset());
    }
  }

  /**
   * タイマーを開始
   */
  start() {
    if (this.state.status === TIMER_STATES.IDLE || this.state.status === TIMER_STATES.FINISHED) {
      this.state = timerReducer(this.state, {
        type: TIMER_ACTIONS.START,
        now: Date.now() / 1000
      });
      this.startTime = Date.now() / 1000;
      this.tick();
    }
  }

  /**
   * タイマーを一時停止
   */
  pause() {
    if (this.state.status === TIMER_STATES.RUNNING) {
      this.state = timerReducer(this.state, {
        type: TIMER_ACTIONS.PAUSE
      });
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
      }
      this.render();
    }
  }

  /**
   * タイマーを再開
   */
  resume() {
    if (this.state.status === TIMER_STATES.PAUSED) {
      this.state = timerReducer(this.state, {
        type: TIMER_ACTIONS.RESUME,
        now: Date.now() / 1000
      });
      this.tick();
    }
  }

  /**
   * タイマーをリセット
   */
  reset() {
    this.state = timerReducer(this.state, {
      type: TIMER_ACTIONS.RESET
    });
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.render();
  }

  /**
   * ティック処理（毎フレーム）
   * requestAnimationFrame で呼び出される
   */
  tick = () => {
    if (this.state.status !== TIMER_STATES.RUNNING) {
      return;
    }

    // 状態を更新
    const now = Date.now() / 1000;
    this.state = timerReducer(this.state, {
      type: TIMER_ACTIONS.TICK,
      now: now
    });

    // タイムアップ判定（currentTime <= 0）
    if (this.state.currentTime <= 0) {
      const oldMode = this.state.mode;
      this.state = timerReducer(this.state, {
        type: TIMER_ACTIONS.COMPLETE
      });

      console.log(`[TimerApp] Session complete: ${oldMode} → ${this.state.mode}`);
      
      // Phase 2: 通知・サウンド発火
      this.onSessionComplete(oldMode);
    } else {
      // 継続
      this.animationId = requestAnimationFrame(this.tick);
    }

    this.render();
  };

  /**
   * セッション完了時のコールバック
   * @param {string} completedMode - 完了したモード
   */
  onSessionComplete(completedMode) {
    if (completedMode === TIMER_MODES.FOCUS.key) {
      const completedAt = new Date().toISOString();
      this.dailyStats = sessionRepository.recordCompletedFocusSession(completedAt);
      void this.syncCompletedFocusSession(completedAt);
    }

    // Phase 2: 通知・サウンド・振動を実行
    console.log(`[TimerApp] Triggering notification for: ${completedMode}`);
    notifyCompletionFull(completedMode);
  }

  /**
   * 画面を再描画
   */
  render() {
    const currentMode = Object.values(TIMER_MODES).find((mode) => mode.key === this.state.mode) || TIMER_MODES.FOCUS;

    // タイマー時間表示
    const timeStr = renderTime(this.state.currentTime);
    view.updateTimer(timeStr);

    // モード表示
    view.updateMode(currentMode.label, this.getModeCaption());
    view.updateThemeMode(this.state.mode);

    // ステータステキスト
    const statusStr = renderStatus(this.state.status, this.state.mode);
    view.updateStatus(statusStr);

    // 進捗リング（現在のモードに応じて max time を取得）
    const ringData = renderProgressRing(this.state.currentTime, currentMode.time);
    view.updateProgressRing(ringData);

    // 統計情報（localStorage から復元した当日値を表示）
    const stats = renderDailyStats(
      this.dailyStats.completedSessions,
      this.dailyStats.focusMinutes
    );
    view.updateStats(stats);

    // ボタン状態
    const btnStates = renderButtonStates(this.state.status);
    view.updateButtonStates(btnStates);

    // Phase 2: ボタンテキスト動的更新
    this.updateButtonLabels();
  }

  /**
   * ボタンテキストを状態に応じて動的に更新
   */
  updateButtonLabels() {
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      if (this.state.status === TIMER_STATES.FINISHED) {
        startBtn.textContent = '次を開始';
      } else {
        startBtn.textContent = '開始';
      }
    }
  }

  /**
   * モードごとの補助テキストを返す
   * @returns {string} 表示用テキスト
   */
  getModeCaption() {
    if (this.state.mode === TIMER_MODES.FOCUS.key) {
      return this.state.status === TIMER_STATES.FINISHED
        ? '次は短い休憩に切り替えます'
        : '次の25分に集中';
    }

    if (this.state.mode === TIMER_MODES.SHORT_BREAK.key) {
      return this.state.status === TIMER_STATES.FINISHED
        ? '次の集中セッションを始められます'
        : '呼吸を整える5分の休憩';
    }

    return '長めの休憩でリズムを整える';
  }

  async syncStatsFromServer() {
    try {
      const localRecord = sessionRepository.getTodayRecord();
      const serverStats = await this.apiClient.getStatsToday();
      const missingCount = Math.max(
        0,
        localRecord.completedFocusSessions.length - serverStats.completedSessions
      );

      if (missingCount > 0) {
        const missingSessions = localRecord.completedFocusSessions.slice(-missingCount);
        await Promise.all(
          missingSessions.map((completedAt) => this.apiClient.createSession(
            TIMER_MODES.FOCUS.key,
            TIMER_MODES.FOCUS.time,
            completedAt
          ))
        );
        const refreshedStats = await this.apiClient.getStatsToday();
        this.updateDailyStats(refreshedStats);
        return;
      }

      this.updateDailyStats(serverStats);
    } catch (error) {
      console.warn('[TimerApp] Failed to sync stats from server:', error);
    }
  }

  async syncCompletedFocusSession(completedAt) {
    try {
      await this.apiClient.createSession(
        TIMER_MODES.FOCUS.key,
        TIMER_MODES.FOCUS.time,
        completedAt
      );
      const refreshedStats = await this.apiClient.getStatsToday();
      this.updateDailyStats(refreshedStats);
    } catch (error) {
      console.warn('[TimerApp] Failed to sync completed session:', error);
    }
  }

  updateDailyStats(stats) {
    this.dailyStats = {
      completedSessions: stats.completedSessions,
      focusMinutes: stats.focusMinutes
    };
    this.render();
  }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
  window.timerApp = new TimerApp();
  console.log('[TimerApp] Phase 1A: Core functionality ready');
});
