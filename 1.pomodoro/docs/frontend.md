# フロントエンドドキュメント

フロントエンドのコード（HTML / CSS / JavaScript）はすべて `app.py` の `HTML_TEMPLATE` 文字列にインラインで記述されています。外部ファイルや外部ライブラリへの依存はありません。起動時に定数（`XP_PER_FOCUS`、`XP_PER_LEVEL`、`FOCUS_MINUTES`）が Python 側で埋め込まれ、`HTML` 変数として配信されます。

---

## HTML 構造

```
body
├── main
│   ├── section.card           # セッション操作パネル
│   │   ├── h1                 # タイトル「Pomodoro ゲーミフィケーション」
│   │   └── div.row
│   │       ├── button#complete-btn   # 集中セッション完了（+XP）
│   │       └── button#attempt-btn   # セッション試行のみ（+0 XP）
│   ├── section.card           # プロフィール
│   │   ├── div#level-text     # レベル表示 (例: "Lv.3")
│   │   ├── div.progress > span#level-progress  # XP進捗バー
│   │   └── p#xp-text          # XP テキスト (例: "総XP: 250 / 次Lvまで 50 XP")
│   ├── section.card           # ストリーク
│   │   ├── div.streak > span#streak-days     # 現在の連続日数
│   │   └── div > strong#max-streak-days      # 最大ストリーク日数
│   ├── section.card           # 週間 / 月間統計
│   │   ├── div.stats-grid#stats-grid         # 統計メトリクスグリッド
│   │   └── div.chart#hourly-chart            # 時間帯別棒グラフ（24本）
│   └── section.card           # バッジコレクション
│       └── div.badge-grid#badge-grid         # バッジ一覧グリッド
└── div#toasts                  # トースト通知（バッジ獲得時）
```

---

## CSS コンポーネント

### CSS カスタムプロパティ（変数）

| CSS 変数 / 値 | 説明 |
|--------------|------|
| `color-scheme: light dark` | システムのカラーモードに対応 |
| `background: #0f172a` | ページ背景色（ダーク） |
| `color: #e2e8f0` | テキスト色 |
| `.card { background: #1e293b }` | カード背景色 |
| `button { background: #22c55e }` | メインボタン色（緑） |
| `button.secondary { background: #64748b }` | セカンダリボタン色 |
| `.streak { color: #f59e0b }` | ストリーク数値の色（アンバー） |
| `.badge.unlocked { border-color: #22c55e; background: #14532d }` | 獲得済みバッジのスタイル |
| `.toast { background: #16a34a }` | トースト通知の背景色 |
| `.bar { background: #06b6d4 }` | 時間帯グラフの棒グラフ色 |

---

## JavaScript 定数・設定

```javascript
const STORAGE_KEY = 'pomodoro_gamification_v1';  // localStorage キー
const XP_PER_FOCUS = 25;    // Pythonから埋め込まれる定数
const XP_PER_LEVEL = 100;   // Pythonから埋め込まれる定数
const FOCUS_MINUTES = 25;   // Pythonから埋め込まれる定数

const BADGES = [
  { id: 'streak_3', title: '3日連続完了', description: '3日連続で集中セッションを完了' },
  { id: 'week_10',  title: '今週10回完了', description: '過去7日で10回の完了を達成' }
];
```

---

## JavaScript 関数

### `todayKey(d?)`

現在日付を `"YYYY-MM-DD"` 形式の文字列で返します。

### `parseDate(key)`

`"YYYY-MM-DD"` 文字列を `Date` オブジェクトに変換します。パース失敗時は `null` を返します。

### `diffDays(a, b)`

2 つの `Date` オブジェクト間の日数差（整数）を返します。

### `defaultState()`

初期状態オブジェクトを返します。

```javascript
{
  totalXP: 0, completed: 0, attempted: 0, totalFocusMinutes: 0,
  history: [], streak: 0, maxStreak: 0, lastCompletionDate: null,
  badges: [], updatedAt: ''
}
```

### `mergeState(source)`

`defaultState()` をベースに `source` をマージして返します。欠損フィールドを補完します。

### `loadState()` (async)

1. `localStorage` からローカル状態を読み込む
2. `GET /api/state` でサーバー状態を取得する
3. `updatedAt` を比較し、新しい方を返す

### `saveState(state)`

1. `state.updatedAt` を現在の ISO タイムスタンプで更新
2. `localStorage` に保存
3. `POST /api/state` でサーバーに非同期送信（失敗は無視）

### `refreshStreakForToday(state)`

`lastCompletionDate` と今日の日数差が 1 超の場合、`state.streak` を 0 にリセットします。

### `updateStreakOnComplete(state)`

集中セッション完了時にストリークを更新します。`lastCompletionDate` を今日の日付に設定します。

### `getLevel(totalXP)`

```javascript
// 戻り値: { level, progressXP, next }
```

| 項目 | 計算式 |
|------|--------|
| `level` | `floor(totalXP / XP_PER_LEVEL) + 1` |
| `progressXP` | `totalXP % XP_PER_LEVEL` |
| `next` | `XP_PER_LEVEL`（固定値） |

### `statsForDays(state, days)`

指定した過去日数の統計を計算して返します。

| 戻り値フィールド | 説明 |
|----------------|------|
| `completionRate` | 完了率（%） |
| `avgFocus` | 平均集中時間（分） |
| `avgSessionsPerDay` | 1日あたり平均セッション数 |
| `peakHour` | 最多完了の時間帯（0〜23） |
| `hourCounts` | 各時間帯の完了セッション数（24要素配列） |

### `detectNewBadges(state)`

解放条件を確認して新しく獲得したバッジ ID の配列を返し、`state.badges` を更新します。

### `showToasts(ids)`

バッジ ID の配列を受け取り、3秒後に自動消滅するトースト通知を画面右下に表示します。

### `render(state)`

状態に基づいて UI 全体を更新します。

1. レベルテキスト・XP テキスト・XP 進捗バーを更新
2. ストリーク数値・最大ストリーク数値を更新
3. 週間・月間の統計メトリクス（8項目）を描画
4. 過去 30 日の時間帯別棒グラフを描画
5. バッジコレクションを描画（獲得済みは `.unlocked` クラス付き）

### `registerAttempt(state, completed)`

ボタンクリック時に呼ばれます。

1. `refreshStreakForToday(state)` でストリークを確認
2. `state.attempted` をインクリメント
3. 履歴エントリを `state.history` に追加
4. `completed === true` の場合: XP 加算・集中時間加算・ストリーク更新
5. `detectNewBadges(state)` でバッジを確認
6. `saveState(state)` で保存
7. `render(state)` で UI を更新
8. `showToasts(newBadges)` で通知を表示

---

## ボタンイベントハンドラー

| ボタン | ID | 動作 |
|--------|-----|------|
| 集中セッション完了ボタン | `complete-btn` | `registerAttempt(state, true)` |
| セッション試行のみボタン | `attempt-btn` | `registerAttempt(state, false)` |

---

## 初期化フロー

```javascript
(async function init() {
  const state = await loadState();   // サーバーまたはlocalStorageから状態をロード
  refreshStreakForToday(state);       // 起動時にストリークを更新
  render(state);                     // 初回描画
  // ボタンにイベントリスナーを登録
})();
```
