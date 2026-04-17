/**
 * 通知機能（ブラウザ通知 + サウンド）
 * Phase 2: 完了処理
 */

/**
 * Notification API のパーミッションをリクエスト
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notifier] Notification API not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Notifier] Failed to request permission:', error);
      return false;
    }
  }

  return false;
}

/**
 * ブラウザ通知を表示
 * @param {string} title - 通知タイトル
 * @param {object} options - Notification オプション
 */
export function showNotification(title, options = {}) {
  if (!('Notification' in window)) {
    console.warn('[Notifier] Notification API not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notifier] Notification permission not granted');
    return null;
  }

  try {
    const notification = new Notification(title, {
      icon: '/static/img/icon-192.png',
      badge: '/static/img/badge-96.png',
      tag: 'pomodoro-timer',
      ...options
    });

    // クリック時にウィンドウにフォーカス
    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('[Notifier] Failed to show notification:', error);
    return null;
  }
}

/**
 * Web Audio API でビープ音を生成
 * @param {number} volume - 音量（0-1）デフォルト 0.3
 * @param {number} frequency - 周波数（Hz）デフォルト 440Hz
 * @param {number} duration - 継続時間（秒）デフォルト 0.5
 */
export function playBeepSound(volume = 0.3, frequency = 440, duration = 0.5) {
  try {
    // AudioContext の取得（ブラウザ互換性対応）
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn('[Notifier] Web Audio API not supported');
      return;
    }

    const audioContext = new AudioContext();

    // オシレータの作成
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // 周波数・波形設定
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    // 音量設定（指数関数的減衰）
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    // オシレータとゲインを接続
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 再生
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (error) {
    console.error('[Notifier] Failed to play beep sound:', error);
  }
}

/**
 * セッション完了時の通知（ブラウザ通知 + サウンド）
 * @param {string} mode - 完了したモード（focus / short_break / long_break）
 */
export function notifyCompletion(mode) {
  const messages = {
    focus: {
      title: 'ポモドーロタイマー',
      body: '作業セッションが終了しました。休憩を始めてください。'
    },
    short_break: {
      title: 'ポモドーロタイマー',
      body: '休憩時間が終了しました。次のセッションを開始してください。'
    },
    long_break: {
      title: 'ポモドーロタイマー',
      body: '長休憩が終了しました。準備はいいですか？'
    }
  };

  const message = messages[mode] || messages.focus;

  // サウンド再生
  playBeepSound(0.3, 440, 0.5);

  // ブラウザ通知表示
  showNotification(message.title, {
    body: message.body,
    tag: `pomodoro-${mode}`
  });

  // フォールバック: favicon 点滅 + タイトル更新
  setFaviconBlinking();
  updatePageTitleNotification(message.title);
}

/**
 * Favicon を点滅させる（フォールバック通知）
 */
export function setFaviconBlinking() {
  const originalTitle = document.title;
  let blink = true;
  let blinkCount = 0;
  const maxBlinks = 10; // 5秒間（500ms x 10）

  const blinkInterval = setInterval(() => {
    document.title = blink ? '✓ ' + originalTitle : originalTitle;
    blink = !blink;
    blinkCount++;

    if (blinkCount >= maxBlinks) {
      clearInterval(blinkInterval);
      document.title = originalTitle;
    }
  }, 500);
}

/**
 * ページタイトルを一時的に更新（通知）
 * @param {string} title - 表示するタイトル
 */
export function updatePageTitleNotification(title) {
  const originalTitle = document.title;
  document.title = `📢 ${title}`;

  // 3秒後に元に戻す
  setTimeout(() => {
    document.title = originalTitle;
  }, 3000);
}

/**
 * スマートフォン振動（Vibration API）
 * @param {array} pattern - 振動パターン [on, off, on, ...]
 */
export function vibrateDevice(pattern = [200, 100, 200]) {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('[Notifier] Vibration failed:', error);
    }
  }
}

/**
 * セッション完了時の総合通知（全パターン実行）
 * @param {string} mode - 完了したモード
 */
export function notifyCompletionFull(mode) {
  // 1. ビープ音
  playBeepSound(0.3, 440, 0.5);

  // 2. ブラウザ通知
  notifyCompletion(mode);

  // 3. スマートフォン振動
  vibrateDevice([200, 100, 200]);
}
