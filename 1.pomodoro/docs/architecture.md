# アーキテクチャ概要

ポモドーロタイマーアプリケーションの現在の実装アーキテクチャです。

---

## 全体構成

```
ブラウザ（フロントエンド）
  └── static/js/app.js            ← エントリポイント（TimerApp クラス）
        ├── domain/               ← ドメイン層（純粋ロジック）
        │   ├── constants.js      ← 定数・型定義
        │   ├── timerReducer.js   ← 状態管理（Reducer パターン）
        │   └── timeCalc.js       ← 時間計算エンジン
        ├── presentation/         ← プレゼンテーション層
        │   ├── presenter.js      ← 状態→表示データ変換（純粋関数）
        │   └── view.js           ← DOM 操作（View クラス）
        └── infrastructure/       ← インフラ層
            ├── apiClient.js      ← Flask API クライアント
            ├── sessionRepository.js  ← localStorage 永続化
            └── notifier.js       ← ブラウザ通知・サウンド

Flask サーバー（バックエンド）
  └── app.py                      ← Flask アプリ（単一ファイル構成）
        ├── GET  /                → index.html 配信
        ├── GET  /api/stats/today → 当日統計
        ├── POST /api/sessions    → セッション記録
        └── POST /api/reset-today → 当日リセット
```

---

## フロントエンド層構成

### ドメイン層（`static/js/domain/`）

ビジネスロジックを副作用なしの純粋関数・定数で実装します。

| ファイル | 役割 |
|---|---|
| `constants.js` | タイマーモード・状態・アクション型・通知メッセージ等の定数定義 |
| `timerReducer.js` | `(state, action) => newState` パターンの状態マシン |
| `timeCalc.js` | 時間フォーマット・残り時間・進捗率の純粋計算関数 |

**状態遷移図（timerReducer）**

```
idle ──START──► running ──PAUSE──► paused
  ▲                │                 │
  │              TICK             RESUME
  │                ▼                 ▼
  │           currentTime         running
  │           <= 0 → COMPLETE
  │                │
RESET            finished
  │                │
  └────────────────┘
```

### プレゼンテーション層（`static/js/presentation/`）

状態オブジェクトを UI 表示データに変換し、DOM へ反映します。

| ファイル | 役割 |
|---|---|
| `presenter.js` | 状態→表示データ変換（時間文字列・ステータスラベル・統計・ボタン有効/無効） |
| `view.js` | DOM 要素更新（`View` クラス）。ロジックは持たない |

### インフラ層（`static/js/infrastructure/`）

外部システムとのやり取りを担当します。

| ファイル | 役割 |
|---|---|
| `apiClient.js` | Flask API との HTTP 通信（`ApiClient` クラス） |
| `sessionRepository.js` | localStorage を使った当日セッション永続化（`SessionRepository` クラス） |
| `notifier.js` | ブラウザ通知（Notification API）・サウンド（Web Audio API）・フォールバック通知 |

### アプリケーション層（`static/js/app.js`）

`TimerApp` クラスが各層を統合し、タイマーの動作フロー全体を管理します。

- `requestAnimationFrame` によるティック処理
- セッション完了時の通知・localStorage 更新・API 同期
- 初期化時にサーバーと localStorage の差分を同期

---

## バックエンド構成

Flask は単一ファイル（`app.py`）で実装されています。レイヤー分離は行っておらず、ルーティング・バリデーション・集計処理がすべて同一ファイルに記述されています。

| コンポーネント | 説明 |
|---|---|
| `sessions_db` | `dict[str, list]` 形式のメモリ内ストレージ。日付文字列をキーにセッション一覧を保持 |
| `get_today_key()` | `date.today().isoformat()` で当日キーを生成 |
| `get_today_sessions()` | 当日セッション一覧を取得（存在しない場合は空リストを初期化） |
| `build_today_stats()` | `mode == 'focus' and completed == True` のセッションを集計 |

---

## データフロー

### タイマー完了時のデータフロー

```
1. requestAnimationFrame tick
     └── currentTime <= 0 → COMPLETE アクション
2. onSessionComplete(completedMode)
     ├── sessionRepository.recordCompletedFocusSession(completedAt)  # localStorage 更新
     └── apiClient.createSession(mode, duration, completedAt)        # サーバー同期
           └── apiClient.getStatsToday()                             # 統計更新
3. render() → View.updateStats()                                     # 画面更新
```

### 起動時の同期フロー

```
1. TimerApp 初期化
2. sessionRepository.getTodayStats()  # localStorage から統計を復元
3. apiClient.getStatsToday()          # サーバー統計を取得
4. 差分があれば apiClient.createSession() で不足分を送信
5. 最新統計で画面を更新
```

---

## 依存関係

```
app.js
  ├── domain/timerReducer.js
  │   └── domain/constants.js
  ├── domain/constants.js
  ├── presentation/presenter.js
  │   └── domain/timeCalc.js
  ├── presentation/view.js
  ├── infrastructure/notifier.js
  ├── infrastructure/apiClient.js
  └── infrastructure/sessionRepository.js
      └── domain/constants.js
```

---

## 技術スタック

| 区分 | 技術 |
|---|---|
| バックエンド | Python 3 / Flask |
| フロントエンド | Vanilla JS（ES Modules）|
| 通知 | Notification API / Web Audio API / Vibration API |
| 永続化（クライアント） | localStorage |
| 永続化（サーバー） | メモリ内辞書（再起動でリセット） |
| テンプレート | Jinja2（Flask 標準） |
| スタイル | CSS カスタムプロパティ（CSS Variables）|
