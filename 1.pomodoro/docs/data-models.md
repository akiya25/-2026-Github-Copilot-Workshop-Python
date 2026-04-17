# データモデル

Pomodoro アプリはデータベースを使用しません。サーバー側の永続化ストレージはなく、すべての状態はブラウザの JavaScript 変数として管理されます。

## サーバー側定数

`app.py` で定義される定数です。`build_html()` によって HTML 内の JavaScript に埋め込まれます。

| 定数名 | 型 | 値 | 説明 |
|--------|----|----|------|
| `FOCUS_SECONDS` | `int` | `1500` | 集中タイムの秒数（25分） |
| `BREAK_SECONDS` | `int` | `300` | 休憩タイムの秒数（5分） |

## フロントエンド状態変数

ブラウザ上の JavaScript が保持するランタイム状態です。

| 変数名 | 型 | 初期値 | 説明 |
|--------|-----|--------|------|
| `mode` | `string` | `'focus'` | 現在のモード (`'focus'` または `'break'`) |
| `total` | `number` | `totalFocus` | 現在のモードの合計秒数 |
| `remainingMs` | `number` | `total * 1000` | 残り時間（ミリ秒） |
| `isRunning` | `boolean` | `false` | タイマーが動作中かどうか |
| `startEpoch` | `number` | `0` | タイマー開始時点の `performance.now()` 値 |
| `baseMs` | `number` | `remainingMs` | タイマー開始時点の残り時間（ミリ秒） |
| `frameId` | `number` | `0` | `requestAnimationFrame` のフレームID |

## カラーステージ定義

残り時間の割合に応じてリングの色が変化します。

| CSS 変数 | 色コード | 適用条件（ratio） |
|----------|----------|----------------|
| `--color-calm` | `#4da3ff` | ratio > 0.75（残り75%以上） |
| `--color-steady` | `#47d7ac` | ratio > 0.5（残り50〜75%） |
| `--color-mid` | `#ffd166` | ratio > 0.25（残り25〜50%） |
| `--color-danger` | `#ff5d73` | ratio ≤ 0.25（残り25%以下） |
