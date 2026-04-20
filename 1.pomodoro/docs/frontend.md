# フロントエンドモジュール仕様

`static/js/` 配下の JavaScript モジュールと UI コンポーネントの仕様です。

---

## ディレクトリ構成

```
static/js/
├── app.js                      # メインエントリポイント（TimerApp クラス）
├── domain/
│   ├── constants.js            # 定数・型定義
│   ├── timerReducer.js         # 状態管理（Reducer）
│   └── timeCalc.js             # 時間計算エンジン
├── infrastructure/
│   ├── apiClient.js            # Flask API クライアント
│   ├── notifier.js             # 通知機能
│   └── sessionRepository.js   # localStorage 永続化
└── presentation/
    ├── presenter.js            # 表示データ変換（純粋関数）
    └── view.js                 # DOM 操作（View クラス）
```

---

## app.js — TimerApp クラス

アプリケーションのメインクラスです。全モジュールを統合し、タイマーの動作を制御します。

### 初期化処理

1. `sessionRepository.getTodayStats()` で localStorage から統計を復元
2. `requestNotificationPermission()` でブラウザ通知パーミッションを要求
3. `setupUI()` → `view.ensurePauseButton()` / `view.ensureResumeButton()` でボタンを準備
4. `setupEventListeners()` でイベントリスナーをセットアップ
5. `render()` で初期画面を描画
6. `syncStatsFromServer()` でサーバーと localStorage の差分を同期

### 主なメソッド

| メソッド | 説明 |
|---|---|
| `setupUI()` | `ensurePauseButton()` / `ensureResumeButton()` を呼び出してボタンを準備 |
| `setupEventListeners()` | 各ボタンにクリックイベントリスナーを登録 |
| `start()` | タイマー開始。`idle` または `finished` 状態の場合のみ実行 |
| `pause()` | タイマー一時停止 |
| `resume()` | タイマー再開 |
| `reset()` | タイマーをリセット（初期状態に戻す） |
| `tick()` | `requestAnimationFrame` で毎フレーム呼ばれる更新処理 |
| `onSessionComplete(mode)` | セッション完了時の処理（通知・localStorage・API 同期） |
| `render()` | 画面全体を現在の状態で更新 |
| `updateButtonLabels()` | 開始ボタンのテキストを状態に応じて動的更新（`finished` 時は「次を開始」） |
| `getModeCaption()` | 現在のモード・状態に応じた補助テキストを返す |
| `syncStatsFromServer()` | 起動時にサーバー統計と localStorage を同期 |
| `syncCompletedFocusSession(completedAt)` | focus 完了時にサーバーへセッションを送信し統計を更新 |
| `updateDailyStats(stats)` | `dailyStats` を更新し `render()` を呼び出す |

---

## domain/timerReducer.js — 状態管理

`(state, action) => newState` の純粋関数です。

### initialState

```javascript
{
  status: 'idle',
  mode: 'focus',
  currentTime: 1500,  // 25分（秒）
  targetTime: null,
  totalSessions: 0
}
```

### timerReducer(state, action)

各アクションの `now` プロパティは `Date.now() / 1000`（UNIX timestamp 秒）です。

| アクション | 処理内容 |
|---|---|
| `START` | `targetTime = now + currentTime` を設定し `running` へ遷移 |
| `PAUSE` | `running` 状態のみ `paused` へ遷移 |
| `RESUME` | `paused` 状態のみ `targetTime` を再設定し `running` へ遷移 |
| `RESET` | `initialState` に完全リセット |
| `TICK` | `currentTime = max(0, targetTime - now)` を更新（ドリフト対応） |
| `COMPLETE` | `finished` へ遷移。次のモードへ自動切替（`focus→short_break→focus`）。focus 完了時に `totalSessions` をインクリメント |

---

## domain/timeCalc.js — 時間計算エンジン

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `formatTime` | `(seconds: number) => string` | 秒数を `"mm:ss"` 形式に変換。`Math.ceil` で切り上げ |
| `calculateProgress` | `(remaining: number, total: number) => number` | 残り時間から進捗率（0〜100）を計算 |
| `calculateRemaining` | `(targetTime: number) => number` | `targetTime - Date.now()/1000` で残り時間を計算（負数は 0） |
| `calculateSvgProgress` | `(progress: number, radius?: number) => object` | SVG 円形プログレス用の `{ dashArray, dashOffset }` を返す |

**`formatTime` 例**

```javascript
formatTime(1500)  // "25:00"
formatTime(75)    // "01:15"
formatTime(0)     // "00:00"
```

**`calculateProgress` 例**

```javascript
calculateProgress(1500, 1500)  // 0   (開始直後)
calculateProgress(750, 1500)   // 50  (中間)
calculateProgress(0, 1500)     // 100 (完了)
```

---

## presentation/presenter.js — 表示データ変換

状態オブジェクトを UI 表示用データへ変換する純粋関数群です。

| 関数 | シグネチャ | 説明 |
|---|---|---|
| `renderTime` | `(seconds: number) => string` | `formatTime` のラッパー |
| `renderProgressRing` | `(remaining: number, total: number) => object` | SVG 進捗リング用パラメータを返す |
| `renderStatus` | `(status: string, mode: string) => string` | 状態＋モードを日本語テキストに変換 |
| `renderDailyStats` | `(completed: number, focusMinutes: number) => object` | 表示用統計データを返す |
| `renderButtonStates` | `(status: string) => object` | 各ボタンの有効/無効フラグを返す |

**`renderStatus` のマッピング**

| status + mode | 表示テキスト |
|---|---|
| `idle` | 未開始 |
| `running_focus` | 作業中 |
| `running_short_break` | 短休憩中 |
| `running_long_break` | 長休憩中 |
| `paused_focus` | 一時停止中（作業） |
| `paused_short_break` | 一時停止中（休憩） |
| `paused_long_break` | 一時停止中（長休憩） |
| `finished_focus` | 作業完了 |
| `finished_short_break` | 休憩完了 |
| `finished_long_break` | 長休憩完了 |

**`renderButtonStates` の返却値**

```javascript
{
  startBtn: status === 'idle' || status === 'finished',
  pauseBtn: status === 'running',
  resumeBtn: status === 'paused',
  resetBtn: status !== 'idle'
}
```

**`renderDailyStats` の返却値**

```javascript
{
  completedSessions: number,   // 完了セッション数
  focusTimeDisplay: string     // 集中時間（60分未満は "分" のみ、60分以上は "h:mm" 形式）
}
```

---

## presentation/view.js — View クラス

DOM 操作のみを担当するクラスです。ビジネスロジックを持ちません。

| メソッド | 対象要素 | 説明 |
|---|---|---|
| `updateTimer(timeString)` | `#timer` | タイマー時間表示を更新 |
| `updateProgressRing(ringData)` | `#progress-ring` | SVG の `stroke-dashoffset` を更新 |
| `updateStatus(statusText)` | `#status` | ステータスラベルを更新 |
| `updateMode(modeLabel, caption)` | `#mode-badge`, `#timer-caption` | モード表示・補助テキストを更新 |
| `updateThemeMode(mode)` | `body[data-mode]` | CSS テーマ切替のための `data-mode` 属性を更新 |
| `updateStats(statsData)` | `#session-count`, `#focus-time` | 統計情報を更新 |
| `updateButtonStates(btnStates)` | 各ボタン | `disabled` 属性と表示/非表示を更新 |
| `updatePageTitle(title)` | `document.title` | ページタイトルを更新 |
| `setFaviconBlinking()` | `document.title` | 5 秒間タイトルを点滅させる（フォールバック通知） |
| `ensurePauseButton()` | `.button-group` | `#pause-btn` が存在しない場合に動的に追加 |
| `ensureResumeButton()` | `.button-group` | `#resume-btn` が存在しない場合に動的に追加 |

---

## infrastructure/apiClient.js — ApiClient クラス

Flask バックエンド API との通信を担当します。

| メソッド | HTTP | エンドポイント | 説明 |
|---|---|---|---|
| `getStatsToday()` | GET | `/api/stats/today` | 当日統計を取得 |
| `createSession(mode, duration, completedAt)` | POST | `/api/sessions` | セッションを記録 |
| `resetToday()` | POST | `/api/reset-today` | 当日データをリセット |

すべてのメソッドは `async` で、レスポンスが `ok` でない場合は `Error` をスローします。

---

## infrastructure/sessionRepository.js — SessionRepository クラス

localStorage を使った当日セッションの永続化を担当します。

| メソッド | 説明 |
|---|---|
| `getTodayStats()` | 当日の統計（`completedSessions`・`focusMinutes`）を返す |
| `getTodayRecord()` | 当日のレコードを返す。日付が変わっていたら空レコードにリセット |
| `recordCompletedFocusSession(completedAt?)` | focus セッション完了を記録し、更新後の統計を返す |
| `clearTodayStats()` | 当日データをクリアし、空の統計を返す |

**コンストラクタ**

```javascript
new SessionRepository(
  storage = globalThis.localStorage,
  nowProvider = () => new Date()
)
```

テスト時は `storage` と `nowProvider` をモックに差し替えられます。

---

## infrastructure/notifier.js — 通知機能

| 関数 | 説明 |
|---|---|
| `requestNotificationPermission()` | Notification API のパーミッションをリクエスト（`async`、`boolean` を返す） |
| `showNotification(title, options?)` | ブラウザ通知を表示。パーミッションがない場合は `null` を返す |
| `playBeepSound(volume?, frequency?, duration?)` | Web Audio API でビープ音を生成（デフォルト: 0.3, 440Hz, 0.5秒） |
| `notifyCompletion(mode)` | モードに応じたブラウザ通知＋サウンド＋フォールバック（`setFaviconBlinking` + `updatePageTitleNotification`）を実行 |
| `notifyCompletionFull(mode)` | `playBeepSound` を呼び出した後、`notifyCompletion` を呼び出し（音が計2回鳴る）、さらに `vibrateDevice` でスマートフォン振動を実行 |
| `setFaviconBlinking()` | 5 秒間（500ms × 10 回）タイトルに `"✓ "` を点滅 |
| `updatePageTitleNotification(title)` | 3 秒間タイトルを `"📢 {title}"` に更新 |
| `vibrateDevice(pattern?)` | Vibration API で振動（デフォルト: `[200, 100, 200]`） |

**通知メッセージ**

| mode | 通知タイトル | 通知本文 |
|---|---|---|
| `focus` | ポモドーロタイマー | 作業セッションが終了しました。休憩を始めてください。 |
| `short_break` | ポモドーロタイマー | 休憩時間が終了しました。次のセッションを開始してください。 |
| `long_break` | ポモドーロタイマー | 長休憩が終了しました。準備はいいですか？ |

---

## HTML テンプレート（templates/index.html）

### 主要 DOM 要素

| 要素 ID / セレクタ | 説明 |
|---|---|
| `#mode-badge` | 現在のモード表示（例: 「集中モード」「短休憩」） |
| `#status` | ステータスラベル（例: 「作業中」「一時停止中」） |
| `#timer-caption` | タイマー補助テキスト（例: 「次の25分に集中」） |
| `#timer` | タイマー時間表示（例: 「25:00」） |
| `#progress-ring` | SVG 円形プログレスインジケーター |
| `#start-btn` | 開始ボタン（`finished` 状態では「次を開始」に変わる） |
| `#pause-btn` | 停止ボタン（HTML に初期配置済み。実行中のみ表示） |
| `#resume-btn` | 再開ボタン（HTML に初期配置済み。一時停止中のみ表示） |
| `#reset-btn` | リセットボタン（`idle` 以外で有効） |
| `#session-count` | 当日完了セッション数 |
| `#focus-time` | 当日集中時間 |
| `.button-group` | ボタンのコンテナ |
| `body[data-mode]` | CSS テーマ切替用属性（`focus` / `short_break` / `long_break`） |

---

## CSS テーマ（static/css/styles.css）

CSS カスタムプロパティ（変数）でテーマを管理します。`body[data-mode]` 属性で自動切替されます。

### ライトモード

| モード | 背景グラデーション | アクセント色 |
|---|---|---|
| `focus`（デフォルト） | 暖色系（`#fff4dd` → `#ffd5c2`） | オレンジ（`#d4632f`） |
| `short_break` | 緑系（`#ebfff8` → `#c8f1eb`） | グリーン（`#1f7a72`） |
| `long_break` | 青系（`#edf4ff` → `#d8e5ff`） | ブルー（`#4564c7`） |

### ダークモード（`@media (prefers-color-scheme: dark)`）

OS のカラースキームが `dark` の場合、各モードの配色が自動的に切り替わります。

| モード | 背景グラデーション | アクセント色 |
|---|---|---|
| `focus`（デフォルト） | 暗い暖色系（`#1a1008` → `#2c1a10`） | オレンジ（`#e87a45`） |
| `short_break` | 暗い緑系（`#08181a` → `#0e2c2a`） | グリーン（`#2aa99d`） |
| `long_break` | 暗い青系（`#0c1020` → `#142040`） | ブルー（`#6382dc`） |
