# Pomodoro Timer Webアプリケーション アーキテクチャ案

## 1. 目的と方針
本アプリは、Flask + HTML/CSS/JavaScriptで実装するポモドーロタイマーである。
初期段階では実装速度と保守性を重視し、シンプルなモノリス構成で開始する。
同時に、将来の機能拡張（認証、履歴、統計分析）に備えて責務分離を行う。

設計上の最重要方針は以下の2点。
- UIの見た目更新とタイマー実時間ロジックを分離する
- ユニットテストしやすいように、時間・永続化・表示を差し替え可能にする

## 2. 全体アーキテクチャ
- プレゼンテーション層: HTML/CSS/JavaScript（単一画面）
- アプリケーション層: Flask（画面配信 + API）
- データ層: 初期はlocalStorage、必要に応じてSQLiteへ移行

責務の分担:
- Flask:
  - 初期画面の配信
  - 当日進捗の取得/保存API
  - 将来拡張（認証、履歴API）の受け皿
- Frontend JavaScript:
  - タイマー状態管理
  - 残り時間計算
  - 進捗リング描画
  - ボタン操作（開始/停止/リセット）

## 3. フロントエンド設計
### 3.1 状態モデル
状態は明示的なステートマシンで管理する。

- status:
  - idle
  - running
  - paused
  - finished
- mode:
  - focus
  - short_break
  - long_break

イベント例:
- START
- PAUSE
- RESUME
- RESET
- TICK
- COMPLETE
- SWITCH_MODE

推奨実装:
- reducer形式で状態遷移を実装（純粋関数）

### 3.2 時間管理方式
時間は「終了予定時刻ベース」で管理する。

- NG: setIntervalで残り秒数を単純減算
- 推奨: remaining = targetTime - now

これにより、タブ非アクティブ時や描画遅延時のドリフトを抑制できる。

### 3.3 UI描画分離
- Presenter層: 状態から表示用データを生成（純粋関数）
- View層: DOM更新のみ担当

主要描画関数:
- renderTime
- renderProgressRing
- renderStatus
- renderDailyStats

## 4. バックエンド設計（Flask）
### 4.1 ルーティング
- GET / : タイマー画面
- GET /api/stats/today : 当日の実績取得
- POST /api/sessions : セッション完了記録
- POST /api/reset-today : 当日実績リセット（任意）

### 4.2 サービス分離
Flaskルートは薄く保ち、業務ロジックをサービス層に分離する。

- TimerService: セッション記録処理
- StatsService: 日次集計処理

効果:
- Flask依存を減らし、サービス単体テストが容易になる

### 4.3 レスポンスデータ（例）
- completedSessions
- focusMinutes
- lastUpdatedAt

## 5. データモデル（将来SQLite化時）
### sessionテーブル案
- id
- started_at
- ended_at
- duration_sec
- mode
- completed

運用方針:
- 初期は都度集計
- パフォーマンス要件が出たら日次集計テーブルを追加

## 6. テスト容易性を高める設計追加
### 6.1 依存性注入（DI）
以下をインターフェース化し、実装差し替え可能にする。

- Clock:
  - SystemClock（本番）
  - FakeClock（テスト）
- Repository:
  - LocalStorageAdapter（初期）
  - SqliteAdapter（将来）

### 6.2 純粋関数の徹底
コアロジック層では以下を禁止する。
- 直接DOM操作
- 直接現在時刻取得
- 直接ストレージアクセス

### 6.3 依存方向
- UI -> Application -> Domain
- Infrastructureは内側に依存させない

## 7. テスト戦略
### 7.1 ユニットテスト（中心）
フロント:
- 状態遷移reducer
- 残り時間計算
- 進捗率計算
- Presenter

バックエンド:
- TimerService
- StatsService
- 日付境界の集計ロジック

### 7.2 統合テスト（最小）
- API正常系
- 主要異常系（不正入力、存在しないデータ）

### 7.3 E2E（少数）
- 開始後にタイマー表示が減る
- 完了時に進捗カードが更新される

目標バランス:
- 70%〜80%をユニットテストで担保
- 残りを統合/E2Eで補完

## 8. 実装フェーズ
1. UIレイアウトの実装
2. タイマーエンジン（状態遷移 + 時間計算）
3. 進捗カード連携
4. localStorage永続化
5. Flask API連携
6. 通知・アクセシビリティ改善

## 9. 参考ディレクトリ構成案
```text
.
├── app.py
├── architecture.md
├── 1.pomodoro/
│   ├── app.py
│   ├── templates/
│   │   └── index.html
│   └── static/
│       ├── css/
│       │   └── styles.css
│       └── js/
│           ├── app.js
│           ├── domain/
│           │   ├── timerReducer.js
│           │   └── timeCalc.js
│           ├── application/
│           │   └── timerService.js
│           ├── infrastructure/
│           │   ├── clock.js
│           │   └── repository.js
│           └── presentation/
│               ├── presenter.js
│               └── view.js
└── tests/
    ├── frontend/
    └── backend/
```

この構成により、初期開発の速さを維持しながら、テスト容易性と将来拡張性の両立を図る。
