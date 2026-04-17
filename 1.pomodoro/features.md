# ポモドーロタイマー 実装機能一覧

## 📋 概要
本ファイルは、ポモドーロタイマーWebアプリケーション実装に必要な全機能を網羅したチェックリストです。
- **ターゲット完了日**：2026-04-20
- **体制**：フロントエンド + バックエンド統合実装

---

## 🎯 要件

### 要件1: 25分の作業タイマー
- [ ] focus mode = 25分（1500秒）を設定
- [ ] カウントダウン表示（mm:ss形式）

### 要件2: 5分の休憩タイマー
- [ ] short_break mode = 5分（300秒）を設定
- [ ] long_break mode = 15分（900秒）を設定（オプション）

### 要件3: 開始・停止・リセット機能
- [ ] 開始ボタン
- [ ] 一時停止ボタン
- [ ] 再開ボタン
- [ ] リセットボタン
- [ ] ボタンの有効/無効状態管理

### 要件4: 進捗表示と統計機能
- [ ] 円形プログレスバー（SVG描画）
- [ ] 当日完了セッション数表示
- [ ] 総集中時間表示
- [ ] 最終更新時刻表示

### 要件5: ブラウザ通知とサウンド通知
- [ ] Notification API統合（タイムアップ時のポップアップ）
- [ ] Web Audio API統合（ビープ音再生）
- [ ] パーミッション管理
- [ ] フォールバック対応（favicon点滅、タイトル更新）

### 要件6: レスポンシブなWebUI
- [ ] スマートフォン対応（≤480px）
- [ ] タブレット対応（481px～1024px）
- [ ] デスクトップ対応（≥1025px）
- [ ] タッチ操作最適化

---

## 🎨 フロントエンド機能

### UI層（HTML + CSS）

#### ページ構成
- [ ] HTML テンプレート（templates/index.html）
  - [ ] ヘッダー：「ポモドーロタイマー」タイトル
  - [ ] メインコンテナ：タイマー表示エリア
  - [ ] 操作パネル：開始・一時停止・再開・リセットボタン
  - [ ] 進捗表示エリア：日次統計カード
  - [ ] フッター：情報テキスト

#### CSS スタイル（static/css/styles.css）
- [ ] グローバルスタイル（フォント、色、リセット）
- [ ] タイマー表示スタイル
  - [ ] mm:ss テキスト表示（中央配置、大型フォント）
  - [ ] 進捗リング（SVG描画用スタイル）
  - [ ] ステータスラベル表示
- [ ] ボタンスタイル
  - [ ] 基本ボタン：同一サイズ、矩形または円形
  - [ ] ホバー・アクティブ状態
  - [ ] 無効状態（disabled時の色変更）
  - [ ] フォーカス状態（キーボード操作対応）
- [ ] 進捗カードスタイル
  - [ ] セッション数表示
  - [ ] 総集中時間表示（時間:分形式）
  - [ ] 最終更新時刻表示
- [ ] ダークモード対応（背景色、テキスト色）

#### Media Query（レスポンシブ）
- [ ] スマートフォン（max-width: 480px）
  - [ ] フルスタック縦積みレイアウト
  - [ ] タイマー表示：200×200px
  - [ ] テキスト：mm:ss フォント3rem
  - [ ] ボタン：48×48px 以上（ヒット領域）
  - [ ] ボタンテキスト：14px 以上
- [ ] タブレット（481px～1024px）
  - [ ] タイマー中央、操作＆進捗下段レイアウト
  - [ ] タイマー表示：280×280px
  - [ ] テキスト：mm:ss フォント4rem
  - [ ] ボタン：56×56px
  - [ ] ボタンテキスト：1rem
- [ ] デスクトップ（min-width: 1025px）
  - [ ] 横2列レイアウト（タイマー左、進捗表示右）
  - [ ] タイマー表示：350×350px
  - [ ] テキスト：mm:ss フォント5rem
  - [ ] ボタン：64×64px
  - [ ] ボタンテキスト：1.1rem

---

### 状態管理層（JavaScript）

#### ステートマシン（static/js/domain/timerReducer.js）
- [ ] 状態オブジェクト定義
  - [ ] status: "idle" | "running" | "paused" | "finished"
  - [ ] mode: "focus" | "short_break" | "long_break"
  - [ ] currentTime: 秒数（number）
  - [ ] targetTime: タイムアップ予定時刻（UNIX timestamp）
- [ ] アクション処理（reducer 関数）
  - [ ] START：idle → running
  - [ ] PAUSE：running → paused
  - [ ] RESUME：paused → running
  - [ ] RESET：任意の状態 → idle
  - [ ] TICK：running 状態での時間更新
  - [ ] COMPLETE：running → finished
  - [ ] SWITCH_MODE：focus ⇄ short_break ⇄ long_break
- [ ] 遷移バリデーション（不正な遷移を防止）
- [ ] 初期状態設定

#### 時間管理エンジン（static/js/domain/timeCalc.js）
- [ ] 時間定義
  - [ ] FOCUS_TIME = 1500秒（25分）
  - [ ] SHORT_BREAK_TIME = 300秒（5分）
  - [ ] LONG_BREAK_TIME = 900秒（15分）
- [ ] 終了予定時刻計算
  - [ ] `calculateTargetTime(mode)`: 現在時刻 + モード時間 = 終了予定時刻
  - [ ] ドリフト対応：`remaining = targetTime - now` で常時計算
- [ ] 残り時間計算
  - [ ] `calculateRemaining(targetTime)`: ミリ秒 → 秒変換
  - [ ] 負数チェック（0以下は0とする）
- [ ] 進捗率計算
  - [ ] `calculateProgress(remaining, total)`: 0～100% の数値
  - [ ] SVG用の角度変換：`progressPercentage * 360 / 100`
- [ ] 表示用時間フォーマット
  - [ ] `formatTime(seconds)`: 秒 → "mm:ss" 文字列変換
  - [ ] 例：75秒 → "01:15"

#### ティック処理（static/js/app.js）
- [ ] requestAnimationFrame または setInterval による定期更新
  - [ ] 推奨：100ms ごと（10回/秒の精度）
- [ ] running 状態のみティック実行
- [ ] 完了判定（remaining ≤ 0）→ COMPLETE イベント発火
- [ ] タブ非アクティブ時のドリフト対応（visibilitychange イベント対応）

---

### Presenter層（表示ロジック）

#### 描画関数（static/js/presentation/presenter.js）
- [ ] `renderTime(seconds: number): string`
  - [ ] 秒数を "mm:ss" 形式に変換
  - [ ] 例：返り値 "25:00", "04:30"
- [ ] `renderProgressRing(progress: number): object`
  - [ ] 進捗率（0～100%）→ SVG arc用パラメータ返却
  - [ ] プロパティ：`{ cx, cy, r, dashArray, dashOffset, transform }`
  - [ ] 完了時（100%）には色変更用フラグも返却
- [ ] `renderStatus(status: string, mode: string): string`
  - [ ] 状態 + モード → 日本語テキスト変換
  - [ ] "running" + "focus" → "作業中"
  - [ ] "paused" + "focus" → "一時停止中"
  - [ ] "running" + "short_break" → "休憩中"
  - [ ] "finished" → "完了"
- [ ] `renderDailyStats(completed: number, focusMinutes: number): object`
  - [ ] 返却：`{ completedSessions, focusTimeDisplay }`
  - [ ] focusMinutes 60分以上は "時間:分" 形式
  - [ ] 例：100分 → "1:40"
- [ ] `renderButtonStates(status: string): object`
  - [ ] 各ボタンの有効/無効状態を返却
  - [ ] 返却：`{ startBtn, pauseBtn, resumeBtn, resetBtn }`
  - [ ] 例：`{ startBtn: false, pauseBtn: true, resumeBtn: false, resetBtn: true }`

---

### View層（DOM更新）

#### DOM操作（static/js/presentation/view.js）
- [ ] `updateTimer(timeString: string): void`
  - [ ] id="timer-display" のテキスト更新
- [ ] `updateProgressRing(ringData: object): void`
  - [ ] SVG の `<circle>` 要素の dashArray / dashOffset 更新
  - [ ] 完了時に色の class 付与
- [ ] `updateStatus(statusText: string): void`
  - [ ] id="status-label" のテキスト更新
- [ ] `updateStats(statsData: object): void`
  - [ ] 完了セッション数を更新
  - [ ] 集中時間を更新
- [ ] `updateButtonStates(btnStates: object): void`
  - [ ] 各ボタンの disabled 属性設定
  - [ ] 各ボタンの class 更新（visual feedback）
- [ ] `setFaviconBlinking(): void`
  - [ ] タイマー完了時、favicon を点滅させる（フォールバック）
- [ ] `updatePageTitle(title: string): void`
  - [ ] ブラウザタイトル更新
  - [ ] 例：完了時に "[!] 完了" を先頭に追加

---

### 通知機能

#### ブラウザ通知（static/js/infrastructure/notifier.js）
- [ ] `requestNotificationPermission(): Promise<boolean>`
  - [ ] 初回起動時にパーミッションリクエスト
  - [ ] 返却：true（許可）/ false（拒否）
- [ ] `notifyCompletion(mode: string): void`
  - [ ] Notification API で通知表示
  - [ ] 通知内容：
    - [ ] mode="focus" → "作業セッションが終了しました。休憩を始めてください。"
    - [ ] mode="short_break" → "休憩時間が終了しました。次のセッションを開始してください。"
    - [ ] mode="long_break" → "長休憩が終了しました。準備はいいですか？"
  - [ ] icon："/static/icon-192.png"
  - [ ] tag："pomodoro-complete"（同時に複数表示しない）
- [ ] `onNotificationClick(callback: function): void`
  - [ ] 通知クリック時に window フォーカス

#### サウンド通知（static/js/infrastructure/notifier.js）
- [ ] `playBeepSound(volume: number = 0.3): void`
  - [ ] Web Audio API で ビープ音生成
  - [ ] 周波数：440Hz + 882Hz（A4 + A5音）
  - [ ] 継続時間：0.5秒
  - [ ] 音量：デフォルト 0.3（0～1.0の範囲）
- [ ] `setAudioVolume(volume: number): void`
  - [ ] 音量調整（0～1.0）
  - [ ] localStorage に保存
- [ ] `isAudioEnabled(): boolean`
  - [ ] localStorage で有効/無効確認

#### フォールバック対応（static/js/infrastructure/notifier.js）
- [ ] `notifyWithFallback(mode: string): void`
  - [ ] ブラウザ通知→サウンド→フォールバック（favicon + title）
  - [ ] 各実装の `isSupported()` チェックして順に実行
- [ ] `vibrateDevice(pattern: number[]): void`
  - [ ] スマホ振動（vibration API）
  - [ ] 例：vibrate([200, 100, 200])
- [ ] `setFavicon Blinking(): void`
  - [ ] OS通知未対応時：favicon 点滅
  - [ ] 継続時間：5秒

---

## 🖥️ バックエンド機能（Flask）

### Flask 基本構造（app.py）
- [ ] Flask アプリケーション初期化
- [ ] テンプレートディレクトリ設定（templates/）
- [ ] スタティックファイルディレクトリ設定（static/）
- [ ] CORS設定（将来のAPI拡張に対応）

### ルーティング

#### GET /
- [ ] templates/index.html を配信
- [ ] タイマーUI を描画

#### GET /api/stats/today
- [ ] JSON 応答：
  ```json
  {
    "completedSessions": 4,
    "focusMinutes": 100,
    "lastUpdatedAt": "2026-04-17T15:30:00Z"
  }
  ```
- [ ] HTTPステータス 200

#### POST /api/sessions
- [ ] リクエストボディ：
  ```json
  {
    "mode": "focus",
    "duration": 1500
  }
  ```
- [ ] セッションを記録
- [ ] レスポンス：
  ```json
  {
    "id": 1,
    "created_at": "2026-04-17T15:30:00Z"
  }
  ```
- [ ] HTTPステータス 201

#### POST /api/reset-today（オプション）
- [ ] 当日実績をリセット
- [ ] レスポンス：`{ "status": "reset" }`
- [ ] HTTPステータス 200

### サービス層

#### TimerService（業務ロジック）
- [ ] `createSession(mode: str, duration: int): dict`
  - [ ] バリデーション：mode は "focus" / "short_break" / "long_break" のみ
  - [ ] バリデーション：duration は 60～3600秒
  - [ ] 現在時刻で started_at 自動設定
  - [ ] 終了時刻で ended_at 自動設定
  - [ ] DB（または localStorage）に保存
  - [ ] 返却：セッションID + タイムスタンプ
- [ ] `getCompletedSessionsToday(): int`
  - [ ] 当日の完了セッション数をカウント
  - [ ] focusモードのセッションのみ集計
- [ ] `getTotalFocusMinutesToday(): int`
  - [ ] 当日の全焦点セッション時間を合算（秒→分に変換）
- [ ] `getLastUpdatedAt(): str`
  - [ ] 最後に記録されたセッションのタイムスタンプ

#### StatsService（集計ロジック）
- [ ] `aggregateToday(): dict`
  - [ ] TimerService から当日データ取得
  - [ ] 集計：completedSessions + focusMinutes + lastUpdatedAt
  - [ ] 日付判定：UTC または JST（設定で切り替え）
  - [ ] 返却：集計済みデータ
- [ ] `resetToday(): bool`
  - [ ] 当日データを全削除
  - [ ] 返却：true（成功）

---

## 💾 データ層機能

### localStorage 実装（初期段階）

#### RepositoryAdapter（static/js/infrastructure/repository.js）
- [ ] `saveSessions(sessions: array): void`
  - [ ] セッション一覧を JSON 文字列化して localStorage に保存
  - [ ] キー形式：`sessions_2026-04-17`（YYYY-MM-DD）
- [ ] `getSessions(date: string): array`
  - [ ] 指定日付のセッション一覧を取得
  - [ ] 日付形式：YYYY-MM-DD
  - [ ] 返却：セッション配列 `[{id, mode, duration, ...}, ...]`
- [ ] `addSession(session: object): void`
  - [ ] 当日のセッション一覧に追加
  - [ ] タイムスタンプで自動ソート
- [ ] `clearToday(): void`
  - [ ] 当日データを削除
- [ ] `getTodayKey(): string`
  - [ ] 本日の日付キーを返却
  - [ ] 例：`sessions_2026-04-17`

#### セッションデータ構造
```javascript
{
  id: 1,                    // ユニークID
  mode: "focus",           // "focus" | "short_break" | "long_break"
  duration: 1500,          // 秒単位
  startedAt: 1713374400,   // UNIX timestamp
  endedAt: 1713375900,     // UNIX timestamp
  completed: true          // 完了フラグ
}
```

#### localStorage キー設計
- `sessions_2026-04-17` ：当日セッション配列
- `timer_settings` ：ユーザー設定（音量、通知ON/OFF）
- `last_sync_at` ：最後にサーバーと同期した時刻

---

## 🧪 テスト機能

### ユニットテスト（フロント）

#### timerReducer.test.js
- [ ] START アクションテスト：idle → running
- [ ] PAUSE アクションテスト：running → paused
- [ ] RESUME アクションテスト：paused → running
- [ ] RESET アクションテスト：任意 → idle
- [ ] COMPLETE アクションテスト：running → finished
- [ ] 不正な遷移テスト（エラーハンドリング）

#### timeCalc.test.js
- [ ] calculateTargetTime テスト：設定時間が正しく計算される
- [ ] calculateRemaining テスト：残り時間が正確に計算される
- [ ] calculateProgress テスト：0～100% で検証
- [ ] formatTime テスト：秒→"mm:ss"が正しく変換
  - [ ] 0秒 → "00:00"
  - [ ] 60秒 → "01:00"
  - [ ] 1500秒 → "25:00"
  - [ ] 3599秒 → "59:59"

#### presenter.test.js
- [ ] renderTime テスト：秒→文字列変換
- [ ] renderProgressRing テスト：進捗率→SVG data
- [ ] renderStatus テスト：status + mode → 日本語
- [ ] renderDailyStats テスト：統計データフォーマット
- [ ] renderButtonStates テスト：状態→ボタン有効/無効

#### notifier.test.js
- [ ] requestNotificationPermission テスト
- [ ] notifyCompletion テスト（Notification API モック）
- [ ] playBeepSound テスト（Web Audio API モック）
- [ ] vibrateDevice テスト（vibration API モック）

### ユニットテスト（バック）

#### test_timer_service.py
- [ ] createSession テスト：セッション記録が正しくされる
- [ ] バリデーション テスト：不正な mode が拒否される
- [ ] バリデーション テスト：不正な duration が拒否される
- [ ] getCompletedSessionsToday テスト：カウント正確性
- [ ] getTotalFocusMinutesToday テスト：合算正確性

#### test_stats_service.py
- [ ] aggregateToday テスト：当日集計が正しく計算される
- [ ] 日付境界テスト：UTC/JST 切り替わり時の動作

### 統合テスト

#### test_api_integration.py
- [ ] GET / テスト：ステータス 200、HTML 配信確認
- [ ] GET /api/stats/today テスト：ステータス 200、JSON 形式確認
- [ ] POST /api/sessions テスト：正常系・ステータス 201
- [ ] POST /api/sessions テスト：異常系・ステータス 400（不正入力）
- [ ] POST /api/reset-today テスト：ステータス 200

### E2Eテスト

#### test_e2e.py（Selenium または Playwright 使用）
- [ ] タイマー開始→カウントダウン→完了フロー
- [ ] 通知が発火することを確認
- [ ] 起動時に画面が表示される
- [ ] ボタン操作で状態が遷移する
- [ ] レスポンシブレイアウトが正しく表示される（複数解像度）

---

## 🏗️ 依存性注入（DI）対応

### Clock インターフェース
- [ ] `SystemClock`：本番環境用（現在時刻を取得）
- [ ] `FakeClock`：テスト用（固定時刻を返す）

### Repository インターフェース
- [ ] `LocalStorageAdapter`：初期実装
- [ ] `SqliteAdapter`：将来版

### Notifier インターフェース
- [ ] `BrowserNotifier`：本番環境用（実際の通知）
- [ ] `MockNotifier`：テスト用（通知ログ記録）

---

## 📁 ディレクトリ構成

```
1.pomodoro/
├── app.py                          # Flask アプリケーション
├── features.md                     # 本ファイル
├── requirements.txt                # Python 依存パッケージ
├── templates/
│   └── index.html                 # UI テンプレート
├── static/
│   ├── css/
│   │   └── styles.css             # スタイルシート
│   ├── js/
│   │   ├── app.js                 # メインエントリポイント
│   │   ├── domain/
│   │   │   ├── timerReducer.js    # 状態管理
│   │   │   ├── timeCalc.js        # 時間計算ロジック
│   │   │   └── constants.js       # 定数定義
│   │   ├── application/
│   │   │   └── timerService.js    # (将来バックエンド連携)
│   │   ├── infrastructure/
│   │   │   ├── clock.js           # 時刻取得抽象層
│   │   │   ├── notifier.js        # 通知機能
│   │   │   └── repository.js      # localStorage アダプタ
│   │   └── presentation/
│   │       ├── presenter.js       # 表示ロジック
│   │       └── view.js            # DOM 操作
│   └── icons/
│       └── icon-192.png           # 通知用アイコン
└── tests/
    ├── frontend/
    │   ├── test_timerReducer.js
    │   ├── test_timeCalc.js
    │   ├── test_presenter.js
    │   └── test_notifier.js
    └── backend/
        ├── test_timer_service.py
        ├── test_stats_service.py
        └── test_api_integration.py
```

---

## ⏰ フェーズ1 実装スケジュール

| 日程 | Phase | 実装項目 | 完了チェック |
|------|-------|---------|------------|
| **2026-04-18** | 1-1 | Flask + HTML/CSS スケルトン | [ ] ブラウザ表示確認 |
| **2026-04-19 AM** | 1-2 | ステートマシン + 時間エンジン | [ ] テスト通過 |
| **2026-04-19 PM** | 1-3 | UI 動作 + レスポンシブ基本 | [ ] ボタン操作で動作 |
| **2026-04-20 AM** | 1-4 | レスポンシブ詳細調整 | [ ] 3 デバイス確認 |
| **2026-04-20 PM** | 1-5 | 通知機能実装 | [ ] 通知＆音が発火 |
| **2026-04-21** | 1-6 | テスト・デバッグ | [ ] すべて通過 |

---

## ✅ チェックリスト活用法

このファイルは実装のガイドになります：

1. **フェーズ1 開始時**：Section ごとに `[ ]` にチェックを入れながら進める
2. **完了時**：`[x]` に更新して進捗を記録
3. **レビュー時**：未チェック項目を確認して漏れを検出

---

## 📝 更新履歴

- **2026-04-17**: 初版作成（アーキテクチャ分析基に）
