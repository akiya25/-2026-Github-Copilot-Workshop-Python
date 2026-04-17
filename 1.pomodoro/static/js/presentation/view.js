/**
 * View層（DOM操作）
 * 状態を画面に反映する責務のみ（ロジックなし）
 */

export class View {
  /**
   * モード表示を更新
   * @param {string} modeLabel - モード表示名
   * @param {string} caption - 補助テキスト
   */
  updateMode(modeLabel, caption) {
    const modeEl = document.getElementById('mode-badge');
    const captionEl = document.getElementById('timer-caption');

    if (modeEl) {
      modeEl.textContent = modeLabel;
    }
    if (captionEl) {
      captionEl.textContent = caption;
    }
  }

  /**
   * 現在モードに応じてページテーマを更新
   * @param {string} mode - モードキー
   */
  updateThemeMode(mode) {
    document.body.dataset.mode = mode;
  }

  /**
   * タイマー時間表示を更新
   * @param {string} timeString - 表示用時間文字列（"mm:ss"）
   */
  updateTimer(timeString) {
    const timerEl = document.getElementById('timer');
    if (timerEl) {
      timerEl.textContent = timeString;
    }
  }

  /**
   * SVG進捗リングを更新
   * @param {object} ringData - SVG更新パラメータ { dashArray, dashOffset }
   */
  updateProgressRing(ringData) {
    const ringEl = document.getElementById('progress-ring');
    if (ringEl) {
      ringEl.style.strokeDashoffset = ringData.dashOffset;
    }
  }

  /**
   * ステータスラベルを更新
   * @param {string} statusText - ステータステキスト
   */
  updateStatus(statusText) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
      statusEl.textContent = statusText;
    }
  }

  /**
   * 統計情報を更新（セッション数・集中時間）
   * @param {object} statsData - 統計データ
   */
  updateStats(statsData) {
    const sessionEl = document.getElementById('session-count');
    const timeEl = document.getElementById('focus-time');

    if (sessionEl) {
      sessionEl.textContent = statsData.completedSessions;
    }
    if (timeEl) {
      timeEl.textContent = statsData.focusTimeDisplay;
    }
  }

  /**
   * ボタンの有効/無効状態を更新
   * @param {object} btnStates - ボタン状態 { startBtn, pauseBtn, resumeBtn, resetBtn }
   */
  updateButtonStates(btnStates) {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resumeBtn = document.getElementById('resume-btn');
    const resetBtn = document.getElementById('reset-btn');

    if (startBtn) {
      startBtn.disabled = !btnStates.startBtn;
      // ボタンテキストを動的に変更
      startBtn.textContent = this.getStartButtonText();
    }
    if (pauseBtn) {
      pauseBtn.disabled = !btnStates.pauseBtn;
      pauseBtn.style.display = btnStates.pauseBtn ? 'inline-block' : 'none';
    }
    if (resumeBtn) {
      resumeBtn.disabled = !btnStates.resumeBtn;
      resumeBtn.style.display = btnStates.resumeBtn ? 'inline-block' : 'none';
    }
    if (resetBtn) {
      resetBtn.disabled = !btnStates.resetBtn;
    }
  }

  /**
   * 開始ボタンのテキストを取得（状態に応じて）
   * @returns {string} ボタンテキスト
   */
  getStartButtonText() {
    const startBtn = document.getElementById('start-btn');
    if (!startBtn) return '開始';
    
    // 初回: "開始"、完了後: "次を開始"
    return startBtn.disabled ? '次を開始' : '開始';
  }

  /**
   * 一時停止ボタンをボタングループに追加
   */
  ensurePauseButton() {
    const btnGroup = document.querySelector('.button-group');
    let pauseBtn = document.getElementById('pause-btn');

    if (!pauseBtn && btnGroup) {
      pauseBtn = document.createElement('button');
      pauseBtn.id = 'pause-btn';
      pauseBtn.className = 'btn btn-secondary';
      pauseBtn.textContent = '停止';
      pauseBtn.style.display = 'none';
      
      // 「開始」ボタンの後に挿入
      const startBtn = document.getElementById('start-btn');
      startBtn.insertAdjacentElement('afterend', pauseBtn);
    }
  }

  /**
   * 再開ボタンをボタングループに追加
   */
  ensureResumeButton() {
    const btnGroup = document.querySelector('.button-group');
    let resumeBtn = document.getElementById('resume-btn');

    if (!resumeBtn && btnGroup) {
      resumeBtn = document.createElement('button');
      resumeBtn.id = 'resume-btn';
      resumeBtn.className = 'btn btn-secondary';
      resumeBtn.textContent = '再開';
      resumeBtn.style.display = 'none';

      // 「停止」ボタンの後に挿入
      const pauseBtn = document.getElementById('pause-btn');
      if (pauseBtn) {
        pauseBtn.insertAdjacentElement('afterend', resumeBtn);
      }
    }
  }

  /**
   * ページタイトルを更新
   * @param {string} title - タイトルテキスト
   */
  updatePageTitle(title) {
    document.title = title;
  }

  /**
   * favicon を点滅させる（フォールバック通知）
   */
  setFaviconBlinking() {
    const originalTitle = document.title;
    let blink = true;
    const blinkInterval = setInterval(() => {
      document.title = blink ? '[!] 完了 - ' + originalTitle : originalTitle;
      blink = !blink;
    }, 500);

    // 5秒後に停止
    setTimeout(() => {
      clearInterval(blinkInterval);
      document.title = originalTitle;
    }, 5000);
  }
}

// View インスタンスをエクスポート
export const view = new View();
