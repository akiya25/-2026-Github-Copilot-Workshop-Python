# ポモドーロタイマー 段階的実装ロードマップ

## 🎯 戦略

**目標**：各フェーズ終了時に、ブラウザで**動作確認可能な状態**を作る

**粒度の原則**
- 依存関係が最小限
- 各フェーズは独立して動作テスト可能
- UI を段階的に追加（後半フェーズほどポーランド）
- バックエンド連携は Phase 5 以降

---

# 📋 Phase 0: プロジェクト初期化（準備作業）

**期間**：~ 2-3時間 | **依存**：なし | **成果**：ブラウザで空白画面表示

## 目標
Flask app が起動し、ブラウザで HTML が配信される状態を作る。

## 実装タスク

### ① Flask アプリケーション セットアップ
- [ ] `1.pomodoro/app.py` 作成
  - Flask インスタンス生成
  - テンプレート・スタティック ディレクトリ設定
  - GET / → index.html 配信

### ② HTML テンプレート スケルトン
- [ ] `1.pomodoro/templates/index.html` 作成
  - 基本 HTML 構造
  - `<div id="app">` コンテナ
  - JS/CSS 読み込みリンク

### ③ CSS ベーススタイル
- [ ] `1.pomodoro/static/css/styles.css` 作成
  - グローバルスタイル（フォント、色、リセット）
  - body / container 基本スタイル
  - placeholder スタイル

### ④ ディレクトリ構造作成
- [ ] `1.pomodoro/static/js/` フォルダ群作成
  - domain/
  - application/
  - infrastructure/
  - presentation/

### ⑤ 定数定義
- [ ] `1.pomodoro/static/js/domain/constants.js` 作成
  ```javascript
  export const TIMER_MODES = {
    FOCUS: { key: 'focus', label: '集中', time: 25 * 60 },
    SHORT_BREAK: { key: 'short_break', label: '短休憩', time: 5 * 60 },
    LONG_BREAK: { key: 'long_break', label: '長休憩', time: 15 * 60 }
  };
  export const TIMER_STATES = ['idle', 'running', 'paused', 'finished'];
  ```

### ⑥ 簡易テスト
```bash
python app.py  # ポート 5000 で起動
# ブラウザ: http://localhost:5000 → 空白ページ表示確認
```

## 成果物チェック
- [x] Flask が起動
- [x] HTML が GET / で配信
- [x] ブラウザで空白画面が見える

---

# 📋 Phase 1A: タイマー コア機能実装

**期間**：2-3 時間 | **依存**：Phase 0 | **成果**：タイマーがカウントダウン開始

## 目標
最小限の UI と動作：画面に「25:00」を表示し、ボタンで開始・リセットできる状態

### ステップ 1-1: 状態管理エンジン

実装ファイル：`1.pomodoro/static/js/domain/timerReducer.js`

```javascript
// 初期状態
const initialState = {
  status: 'idle',      // idle | running | paused | finished
  mode: 'focus',       // focus | short_break | long_break
  currentTime: 0,      // 経過秒数
  targetTime: null,    // タイムアップ予定時刻（UNIX timestamp）
  totalSessions: 0     // 今日のセッション数
};

// Reducer: (state, action) => newState
export function timerReducer(state = initialState, action) {
  switch(action.type) {
    case 'START': 
      return { ...state, status: 'running', targetTime: now + getTimerDuration(state.mode) };
    case 'PAUSE':
      return { ...state, status: 'paused' };
    case 'RESUME':
      return { ...state, status: 'running', targetTime: now + state.currentTime };
    case 'RESET':
      return { ...initialState };
    case 'TICK':
      // 残り時間を計算
      const remaining = state.targetTime - now;
      return { ...state, currentTime: Math.max(0, remaining) };
    case 'COMPLETE':
      return { ...state, status: 'finished', totalSessions: state.totalSessions + 1 };
    default:
      return state;
  }
}

function getTimerDuration(mode) {
  const durations = {
    'focus': 25 * 60,
    'short_break': 5 * 60,
    'long_break': 15 * 60
  };
  return durations[mode] * 1000; // ミリ秒
}
```

**テスト項目**
- [ ] START アクション：状態が running になる
- [ ] RESET アクション：状態が idle に戻る
- [ ] TICK アクション：currentTime が変わる

### ステップ 1-2: 時間計算エンジン

実装ファイル：`1.pomodoro/static/js/domain/timeCalc.js`

```javascript
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function calculateProgress(remaining, total) {
  return Math.max(0, Math.min(100, (1 - remaining / total) * 100));
}
```

**テスト項目**
- [ ] formatTime(25*60) → "25:00"
- [ ] formatTime(0) → "00:00"
- [ ] formatTime(1500) → "25:00"

### ステップ 1-3: 最小限 HTML UI

編集ファイル：`1.pomodoro/templates/index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ポモドーロタイマー</title>
  <link rel="stylesheet" href="/static/css/styles.css">
</head>
<body>
  <div id="app">
    <div class="container">
      <h1>ポモドーロタイマー</h1>
      
      <div class="status-label" id="status">作業中</div>
      
      <!-- タイマー表示 -->
      <div class="timer-display">
        <svg class="progress-ring" width="300" height="300" viewBox="0 0 300 300">
          <!-- 背景円 -->
          <circle cx="150" cy="150" r="130" fill="none" stroke="#e0e0e0" stroke-width="20"/>
          <!-- プログレスリング -->
          <circle id="progress-ring" cx="150" cy="150" r="130" fill="none" 
                  stroke="#6366f1" stroke-width="20"
                  stroke-dasharray="816.81" stroke-dashoffset="816.81"/>
        </svg>
        <div class="timer-text" id="timer">25:00</div>
      </div>
      
      <!-- ボタン -->
      <div class="button-group">
        <button id="start-btn" class="btn btn-primary">開始</button>
        <button id="reset-btn" class="btn btn-outline">リセット</button>
      </div>
      
      <!-- 進捗表示 -->
      <div class="stats-card">
        <h2>今日の進捗</h2>
        <div class="stats-content">
          <div class="stat-item">
            <div class="stat-value" id="session-count">0</div>
            <div class="stat-label">完了</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" id="focus-time">0:00</div>
            <div class="stat-label">集中時間</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <script src="/static/js/domain/constants.js"></script>
  <script src="/static/js/domain/timeCalc.js"></script>
  <script src="/static/js/domain/timerReducer.js"></script>
  <script src="/static/js/presentation/presenter.js"></script>
  <script src="/static/js/presentation/view.js"></script>
  <script src="/static/js/app.js"></script>
</body>
</html>
```

### ステップ 1-4: CSS スタイル（基本）

編集ファイル：`1.pomodoro/static/css/styles.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.container {
  background: white;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 100%;
  text-align: center;
}

h1 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a202c;
}

.status-label {
  font-size: 16px;
  color: #718096;
  margin-bottom: 24px;
}

.timer-display {
  position: relative;
  width: 300px;
  height: 300px;
  margin: 0 auto 32px;
}

.progress-ring {
  transform: rotate(-90deg);
}

.timer-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 72px;
  font-weight: 700;
  color: #1a202c;
}

.button-group {
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  justify-content: center;
}

.btn {
  padding: 12px 32px;
  font-size: 16px;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 600;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover { background: #4f46e5; }
.btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }

.btn-outline {
  background: white;
  color: #6366f1;
  border: 2px solid #6366f1;
}

.btn-outline:hover { background: #f0f4ff; }
.btn-outline:disabled { border-color: #cbd5e1; color: #cbd5e1; }

.stats-card {
  background: #f7fafc;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.stats-card h2 {
  font-size: 14px;
  color: #718096;
  margin-bottom: 12px;
}

.stats-content {
  display: flex;
  justify-content: space-around;
}

.stat-item { }

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #6366f1;
}

.stat-label {
  font-size: 12px;
  color: #a0aec0;
  margin-top: 4px;
}
```

### ステップ 1-5: メインアプリケーション ロジック

実装ファイル：`1.pomodoro/static/js/app.js`

```javascript
import { timerReducer, initialState } from './domain/timerReducer.js';
import { formatTime, calculateProgress } from './domain/timeCalc.js';

class TimerApp {
  constructor() {
    this.state = initialState;
    this.animationId = null;
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    document.getElementById('start-btn').addEventListener('click', () => this.start());
    document.getElementById('reset-btn').addEventListener('click', () => this.reset());
  }

  start() {
    if (this.state.status === 'idle') {
      this.state = timerReducer(this.state, { 
        type: 'START', 
        now: Date.now() 
      });
      this.tick();
    }
  }

  reset() {
    this.state = timerReducer(this.state, { type: 'RESET' });
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.render();
  }

  tick = () => {
    if (this.state.status === 'running') {
      this.state = timerReducer(this.state, { 
        type: 'TICK', 
        now: Date.now() 
      });
      
      if (this.state.currentTime <= 0) {
        this.state = timerReducer(this.state, { type: 'COMPLETE' });
      } else {
        this.animationId = requestAnimationFrame(this.tick);
      }
    }
    this.render();
  };

  render() {
    // タイマー表示更新
    document.getElementById('timer').textContent = formatTime(this.state.currentTime);
    
    // プログレスリング更新
    const total = 25 * 60; // focus mode
    const progress = calculateProgress(this.state.currentTime, total);
    const radius = 130;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress / 100);
    document.getElementById('progress-ring').style.strokeDashoffset = offset;
    
    // ステータス表示
    const statusText = {
      'running': '作業中',
      'paused': '一時停止',
      'finished': '完了',
      'idle': '未開始'
    };
    document.getElementById('status').textContent = statusText[this.state.status];
    
    // ボタン状態
    document.getElementById('start-btn').disabled = this.state.status !== 'idle';
    document.getElementById('reset-btn').disabled = this.state.status === 'idle';
    
    // セッションカウント
    document.getElementById('session-count').textContent = this.state.totalSessions;
  }
}

// アプリ起動
const app = new TimerApp();
```

## 成果物チェック
- [ ] ブラウザで「25:00」が表示される
- [ ] 「開始」ボタンをクリックするとカウントダウン開始
- [ ] タイマーが 1 秒ずつ減少
- [ ] プログレスリングが進捗に応じて増加
- [ ] 「リセット」ボタンで「25:00」に戻る

---

# 📋 Phase 1B: 状態管理強化 + ボタン拡張

**期間**：1-2 時間 | **依存**：Phase 1A | **成果**：一時停止・再開が動作

## 目標
ボタンを「開始」「一時停止」「再開」「リセット」に拡張し、状態遷移を完全実装

## 実装タスク

### ① reducer 拡張
- [ ] PAUSE / RESUME アクション対応

編集ファイル：`1.pomodoro/static/js/domain/timerReducer.js`

```javascript
case 'PAUSE':
  return { ...state, status: 'paused' };
case 'RESUME':
  return { ...state, status: 'running', targetTime: now + state.currentTime };
```

### ② HTML ボタン拡張
- [ ] 一時停止ボタン追加
- [ ] 再開ボタン追加

編集ファイル：`1.pomodoro/templates/index.html`

```html
<div class="button-group">
  <button id="start-btn" class="btn btn-primary">開始</button>
  <button id="pause-btn" class="btn btn-secondary" style="display:none;">停止</button>
  <button id="resume-btn" class="btn btn-secondary" style="display:none;">再開</button>
  <button id="reset-btn" class="btn btn-outline">リセット</button>
</div>
```

### ③ app.js 拡張
- [ ] pause() / resume() メソッド追加
- [ ] ボタン表示/非表示制御

編集ファイル：`1.pomodoro/static/js/app.js`

```javascript
pause() {
  if (this.state.status === 'running') {
    this.state = timerReducer(this.state, { type: 'PAUSE' });
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.render();
  }
}

resume() {
  if (this.state.status === 'paused') {
    this.state = timerReducer(this.state, { 
      type: 'RESUME', 
      now: Date.now() 
    });
    this.tick();
  }
}

render() {
  // ... 既存処理 ...
  
  // ボタン表示制御
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const resumeBtn = document.getElementById('resume-btn');
  
  startBtn.style.display = this.state.status === 'idle' ? 'block' : 'none';
  pauseBtn.style.display = this.state.status === 'running' ? 'block' : 'none';
  resumeBtn.style.display = this.state.status === 'paused' ? 'block' : 'none';
}
```

## 成果物チェック
- [ ] 「開始」で running 状態
- [ ] 「停止」で paused 状態（カウント停止）
- [ ] 「再開」で running 状態（カウント再開）
- [ ] 「リセット」でいつでも idle 状態

---

# 📋 Phase 2: 完了処理 + モード切り替え

**期間**：2 時間 | **依存**：Phase 1B | **成成果**：25分で完了 → 自動休憩モードへ

## 目標
タイマー完了時にビープ音・通知出して、次モード（休憩）に自動切り替え

## 実装タスク

### ① 完了ハンドリング

編集ファイル：`1.pomodoro/static/js/domain/timerReducer.js`

```javascript
case 'COMPLETE':
  // 次のモードを決定
  const nextMode = state.mode === 'focus' ? 'short_break' : 'focus';
  return { 
    ...state, 
    status: 'finished', 
    mode: nextMode,
    currentTime: getTimerDuration(nextMode),
    totalSessions: state.mode === 'focus' ? state.totalSessions + 1 : state.totalSessions
  };
case 'SWITCH_MODE':
  return { 
    ...state, 
    mode: action.mode,
    status: 'idle',
    currentTime: getTimerDuration(action.mode)
  };
```

### ② サウンド + 通知実装

実装ファイル：`1.pomodoro/static/js/infrastructure/notifier.js`

```javascript
export function playBeep() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // 440Hz ビープ
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  
  osc.frequency.value = 440;
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.5);
}

export function showNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
```

### ③ app.js で完了時に通知発火

編集ファイル：`1.pomodoro/static/js/app.js`

```javascript
import { playBeep, showNotification, requestNotificationPermission } from './infrastructure/notifier.js';

constructor() {
  this.state = initialState;
  this.animationId = null;
  requestNotificationPermission();
  this.setupEventListeners();
  this.render();
}

tick = () => {
  if (this.state.status === 'running') {
    this.state = timerReducer(this.state, { 
      type: 'TICK', 
      now: Date.now() 
    });
    
    if (this.state.currentTime <= 0) {
      const oldMode = this.state.mode;
      this.state = timerReducer(this.state, { type: 'COMPLETE' });
      
      // 通知発火
      playBeep();
      const messages = {
        'focus': 'Work session complete! Time for a break.',
        'short_break': 'Break time over. Ready for another session?',
        'long_break': 'Long break complete. Let\'s get back to work!'
      };
      showNotification('ポモドーロタイマー', messages[oldMode]);
    } else {
      this.animationId = requestAnimationFrame(this.tick);
    }
  }
  this.render();
};
```

### ④ 完了後の表示切り替え

編集ファイル：`1.pomodoro/static/js/app.js`

```javascript
render() {
  // ... 既存処理 ...
  
  // 完了時：「次を開始」ボタン
  if (this.state.status === 'finished') {
    startBtn.textContent = '次を開始';
    startBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
    resumeBtn.style.display = 'none';
  }
}

start() {
  if (this.state.status === 'idle' || this.state.status === 'finished') {
    this.state = timerReducer(this.state, { 
      type: 'START', 
      now: Date.now() 
    });
    this.tick();
  }
}
```

## 成果物チェック
- [ ] 25分でタイマー完了（0:00 で止まる）
- [ ] 完了時にビープ音が鳴る
- [ ] 通知ポップアップが表示
- [ ] UI が休憩モード（5分）に自動切り替わり
- [ ] 「次を開始」ボタンが表示

---

# 📋 Phase 3: 進捗表示 + 統計画面

**期間**：1-2 時間 | **依存**：Phase 2 | **成果**：日次統計が正確に表示

## 目標
セッション完了数と集中時間を正確に calculate・表示

## 実装タスク

### ① localStorage 統合

実装ファイル：`1.pomodoro/static/js/infrastructure/repository.js`

```javascript
export class SessionRepository {
  getTodayKey() {
    const today = new Date().toISOString().split('T')[0];
    return `sessions_${today}`;
  }

  getSessions() {
    const key = this.getTodayKey();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  addSession(session) {
    const key = this.getTodayKey();
    const sessions = this.getSessions();
    sessions.push(session);
    localStorage.setItem(key, JSON.stringify(sessions));
  }

  getStats() {
    const sessions = this.getSessions();
    const completedCount = sessions.filter(s => s.mode === 'focus').length;
    const focusMinutes = sessions
      .filter(s => s.mode === 'focus')
      .reduce((sum, s) => sum + s.duration, 0) / 60;
    
    return { completedCount, focusMinutes };
  }

  clearToday() {
    const key = this.getTodayKey();
    localStorage.removeItem(key);
  }
}
```

### ② app.js で統計表示

編集ファイル：`1.pomodoro/static/js/app.js`

```javascript
import { SessionRepository } from './infrastructure/repository.js';

class TimerApp {
  constructor() {
    this.state = initialState;
    this.repository = new SessionRepository();
    // ... 既存処理 ...
  }

  tick = () => {
    if (this.state.status === 'running') {
      // ... 既存処理 ...
      if (this.state.currentTime <= 0) {
        const oldMode = this.state.mode;
        
        // セッション保存
        if (oldMode === 'focus') {
          this.repository.addSession({
            mode: 'focus',
            duration: 25 * 60,
            startedAt: Date.now() - 25 * 60 * 1000,
            completed: true
          });
          // 統計更新
          this.updateStats();
        }
        
        this.state = timerReducer(this.state, { type: 'COMPLETE' });
        playBeep();
        // ... 既存処理 ...
      }
    }
    this.render();
  };

  updateStats() {
    const stats = this.repository.getStats();
    document.getElementById('session-count').textContent = stats.completedCount;
    
    const hours = Math.floor(stats.focusMinutes / 60);
    const mins = stats.focusMinutes % 60;
    const timeStr = hours > 0 ? `${hours}:${String(mins).padStart(2, '0')}` : `${mins}`;
    document.getElementById('focus-time').textContent = timeStr;
  }

  render() {
    // ... 既存処理 ...
    this.updateStats(); // 毎回統計を同期
  }
}
```

## 成果物チェック
- [ ] セッション完了後、統計が更新される
- [ ] localStorage に data が保存される
- [ ] ページリロード後も統計が保持される
- [ ] 日付変わり後にリセット（新キー作成）

---

# 📋 Phase 4: レスポンシブ UI 実装

**期間**：1-2 時間 | **依存**：Phase 3 | **成果**：PC/タブレット/スマートフォン対応

## 目標
3つのブレークポイント（≤480px / 481-1024px / ≥1025px）で正しく表示

## 実装タスク

### ① CSS Media Query 追加

編集ファイル：`1.pomodoro/static/css/styles.css`

```css
/* スマートフォン (max-width: 480px) */
@media (max-width: 480px) {
  .container {
    padding: 20px;
  }
  
  h1 {
    font-size: 20px;
  }
  
  .timer-display {
    width: 200px;
    height: 200px;
    margin: 0 auto 20px;
  }
  
  .timer-text {
    font-size: 48px; /* 3rem */
  }
  
  .btn {
    padding: 10px 20px;
    font-size: 14px;
    min-width: 48px;
    min-height: 48px;
  }
  
  .button-group {
    gap: 8px;
  }
  
  .stats-content {
    flex-direction: column;
    gap: 16px;
  }
}

/* タブレット (481px - 1024px) */
@media (min-width: 481px) and (max-width: 1024px) {
  .container {
    max-width: 100%;
    padding: 24px;
  }
  
  .timer-display {
    width: 280px;
    height: 280px;
    margin: 0 auto 24px;
  }
  
  .timer-text {
    font-size: 64px; /* 4rem */
  }
  
  .btn {
    padding: 12px 28px;
    font-size: 15px;
    min-width: 56px;
    min-height: 56px;
  }
  
  .stats-content {
    flex-direction: row;
  }
}

/* デスクトップ (min-width: 1025px) */
@media (min-width: 1025px) {
  .container {
    max-width: 800px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: start;
  }
  
  .timer-section {
    grid-column: 1;
  }
  
  .stats-section {
    grid-column: 2;
  }
  
  .timer-display {
    width: 350px;
    height: 350px;
  }
  
  .timer-text {
    font-size: 80px; /* 5rem */
  }
  
  .btn {
    padding: 14px 36px;
    font-size: 16px;
    min-width: 64px;
    min-height: 64px;
  }
}
```

### ② HTML レイアウト調整

編集ファイル：`1.pomodoro/templates/index.html`

```html
<div class="container">
  <div class="timer-section">
    <h1>ポモドーロタイマー</h1>
    <div class="status-label" id="status">作業中</div>
    <div class="timer-display">
      <!-- SVG ... -->
    </div>
    <div class="button-group">
      <!-- ボタン ... -->
    </div>
  </div>
  
  <div class="stats-section">
    <div class="stats-card">
      <!-- 統計情報 ... -->
    </div>
  </div>
</div>
```

## 成果物チェック
- [ ] スマートフォン（480px以下）：フルスタック表示
- [ ] タブレット（481-1024px）：2段表示
- [ ] デスクトップ（1025px以上）：左右2列表示
- [ ] 各ブレークポイントでボタン・テキストサイズが適切

---

# 📋 Phase 5: Backend API 連携（オプション）

**期間**：2-3 時間 | **依存**：Phase 4 | **成果**：サーバーと同期

## 目標
Flask API でセッションデータを保存・取得（将来のマルチデバイス対応整備）

## 実装タスク

### ① Flask ルーティング実装

編集ファイル：`1.pomodoro/app.py`

```python
from flask import Flask, render_template, request, jsonify
from datetime import date
import json

app = Flask(__name__)

# メモリ内 DB（将来 SQLite に移行）
sessions_db = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stats/today', methods=['GET'])
def get_stats_today():
    today = str(date.today())
    sessions = sessions_db.get(today, [])
    
    completed = len([s for s in sessions if s['mode'] == 'focus' and s.get('completed')])
    focus_minutes = sum(s['duration'] for s in sessions if s['mode'] == 'focus') // 60
    
    return jsonify({
        'completedSessions': completed,
        'focusMinutes': focus_minutes,
        'lastUpdatedAt': date.today().isoformat()
    })

@app.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.json
    today = str(date.today())
    
    # バリデーション
    if data.get('mode') not in ['focus', 'short_break', 'long_break']:
        return jsonify({'error': 'Invalid mode'}), 400
    
    if not (60 <= data.get('duration', 0) <= 3600):
        return jsonify({'error': 'Invalid duration'}), 400
    
    # セッション保存
    if today not in sessions_db:
        sessions_db[today] = []
    
    session = {
        'id': len(sessions_db[today]) + 1,
        'mode': data['mode'],
        'duration': data['duration'],
        'completed': True
    }
    sessions_db[today].append(session)
    
    return jsonify(session), 201

@app.route('/api/reset-today', methods=['POST'])
def reset_today():
    today = str(date.today())
    if today in sessions_db:
        del sessions_db[today]
    return jsonify({'status': 'reset'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### ② JavaScript API Client

実装ファイル：`1.pomodoro/static/js/infrastructure/apiClient.js`

```javascript
export class ApiClient {
  async getStatsToday() {
    const res = await fetch('/api/stats/today');
    return res.json();
  }

  async createSession(mode, duration) {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, duration })
    });
    return res.json();
  }

  async resetToday() {
    const res = await fetch('/api/reset-today', {
      method: 'POST'
    });
    return res.json();
  }
}
```

### ③ app.js で API 連携

編集ファイル：`1.pomodoro/static/js/app.js`

```javascript
import { ApiClient } from './infrastructure/apiClient.js';

class TimerApp {
  constructor() {
    // ...
    this.apiClient = new ApiClient();
    this.loadStats();
  }

  async loadStats() {
    const stats = await this.apiClient.getStatsToday();
    // UI 更新
  }

  tick = () => {
    if (this.state.status === 'running' && this.state.currentTime <= 0) {
      if (oldMode === 'focus') {
        // セッションをサーバーに保存
        this.apiClient.createSession('focus', 25 * 60);
      }
      // ...
    }
  };
}
```

## 成果物チェック
- [ ] API がセッション保存
- [ ] API が統計取得
- [ ] ブラウザの数字とサーバーが同期

---

# 📋 Phase 6: テスト整備 + ポーランド

**期間**：2-3 時間 | **依存**：Phase 5 | **成果**：テスト済み・品質向上版

## 実装タスク

### ① ユニットテスト（JavaScript）

実装ファイル：`1.pomodoro/tests/frontend/test_timeCalc.js`

```javascript
import { formatTime, calculateProgress } from '../../static/js/domain/timeCalc.js';

describe('timeCalc', () => {
  it('formatTime should format seconds to mm:ss', () => {
    assert.equal(formatTime(0), '00:00');
    assert.equal(formatTime(60), '01:00');
    assert.equal(formatTime(1500), '25:00');
    assert.equal(formatTime(3599), '59:59');
  });

  it('calculateProgress should return 0-100', () => {
    assert.equal(calculateProgress(1500, 1500), 0);
    assert.equal(calculateProgress(750, 1500), 50);
    assert.equal(calculateProgress(0, 1500), 100);
  });
});
```

### ② 統合テスト（Python）

実装ファイル：`1.pomodoro/tests/backend/test_api.py`

```python
import unittest
from app import app

class TestTimerAPI(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_get_stats_today(self):
        res = self.client.get('/api/stats/today')
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('completedSessions', data)
        self.assertIn('focusMinutes', data)

    def test_create_session(self):
        res = self.client.post('/api/sessions', json={
            'mode': 'focus',
            'duration': 1500
        })
        self.assertEqual(res.status_code, 201)

    def test_invalid_mode(self):
        res = self.client.post('/api/sessions', json={
            'mode': 'invalid',
            'duration': 1500
        })
        self.assertEqual(res.status_code, 400)
```

### ③ UI ポーランド

- [ ] フォント・色の統一
- [ ] ボタンホバー・フォーカス状態の改善
- [ ] アニメーション追加（進捗リングの滑らかな更新）
- [ ] ダークモード対応
- [ ] アクセシビリティ対応（ARIA ラベル）

---

# 📊 実装スケジュール詳細表

| Phase | 名称 | 期間 | 累計 | 成果 | 完了チェック |
|-------|------|------|------|------|------------|
| **0** | 初期化 | 2-3h | 2-3h | Flask + HTML スケルトン | [ ] |
| **1A** | コア機能 | 2-3h | 5-6h | タイマー動作 | [ ] |
| **1B** | 状態拡張 | 1-2h | 6-8h | 一時停止・再開 | [ ] |
| **2** | 完了処理 | 2h | 8-10h | 通知・モード切り替え | [ ] |
| **3** | 統計表示 | 1-2h | 9-12h | localStorage 同期 | [ ] |
| **4** | レスポンシブ | 1-2h | 10-14h | 3 デバイス対応 | [ ] |
| **5** | API 連携 | 2-3h | 12-17h | Backend 同期 | [ ] |
| **6** | テスト・品質 | 2-3h | 14-20h | テスト済み版 | [ ] |

---

# 🎯 各フェーズの停止・検証ポイント

各フェーズ終了後に、必ず以下を確認してください：

### Phase 0 チェック
```bash
python app.py
# http://localhost:5000 → 空白ページ表示 OK?
```

### Phase 1A チェック
```bash
# ブラウザコンソール: 
console.log(state) → 状態が画面に反映?
# 「開始」クリック → 「25:00」が「24:59」に?
```

### Phase 1B チェック
```bash
# 「停止」ボタン表示?
# 「再開」ボタン表示?
```

### Phase 2 チェック
```bash
# 1分 (60秒) に設定してテスト
# 0秒で ビープ音鳴った?
# 通知出た?
# UI が "短休憩" に切り替わった?
```

### Phase 3 チェック
```bash
# セッション完了 → カウント増加?
# localStorage に data 保存?
# ページリロード → 統計保持?
```

### Phase 4 チェック
```bash
# ブラウザ幅変更
# ≤480px: フルスタック?
# 481-1024px: 2段?
# ≥1025px: 横2列?
```

### Phase 5 チェック
```bash
curl http://localhost:5000/api/stats/today
# JSON が返る?
```

### Phase 6 チェック
```bash
npm test  # フロントテスト
python -m pytest  # バックテスト
# すべてパスした?
```

---

# 💡 推奨実装順序のポイント

1. **各フェーズは独立している**：Phase 1A を完成させてから 1B に進む
2. **後戻りは最小限**：基本実装（Phase 0-2）で骨組みは完成
3. **UI は後付け**：機能ロジックが完成してから CSS・レスポンシブ
4. **テストは最後**：ざっくり動作確認→詳細テスト

---

# 🚀 クイックスタート

今すぐ始めたければ：

```bash
# Phase 0 実行
cd 1.pomodoro
python app.py
# → ブラウザで http://localhost:5000 開く

# Phase 1A コード追加
# → 「開始」でカウント開始確認

# Phase 1B コード追加
# → 「停止」「再開」確認
```

次のフェーズに進むか、各フェーズの詳細な実装コードが必要でしたら、お知らせください！
