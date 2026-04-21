# Copilot Web Relay - AI チャット Web アプリ

GitHub Copilot SDK を使ったリアルタイム AI チャット Web アプリケーション。

## ⚡ 機能

- ✅ リアルタイムストリーミングチャット
- ✅ Markdown レスポンス対応
- ✅ 完全な TypeScript 型チェック
- ✅ 構造化ログ（DEBUG/INFO/WARN/ERROR）
- ✅ メトリクス収集（接続数、メッセージ数、エラー数）
- ✅ Origin 検証とメッセージ入力値検証
- ✅ セッション管理（Map ベース）
- ✅ ハートビート対応（接続の安定化）
- ✅ グレースフルシャットダウン
- ✅ 包括的なテストスイート（Jest）

## アーキテクチャ

```
┌─────────────────────────────┐
│   ブラウザ (React+TS)        │
│  - useChat フック           │
│  - useWebSocket フック      │
└─────────────┬───────────────┘
              │ WebSocket
              │ (Same-origin proxy)
┌─────────────▼───────────────┐
│  バックエンド (Node.js)     │
│  - Origin 検証              │
│  - メッセージ検証           │
│  - セッション管理           │
│  - メトリクス収集           │
│  - ロギング (構造化)        │
└─────────────┬───────────────┘
              │ SDK Interface
┌─────────────▼───────────────┐
│   Copilot SDK               │
│   (gpt-5.4, claude-sonnet)  │
└─────────────┬───────────────┘
              │
      GitHub Copilot API
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| **フロントエンド** | React 18 + TypeScript + Vite |
| **Hooks** | useChat, useWebSocket (カスタム) |
| **Markdown** | react-markdown + remark-gfm |
| **バックエンド** | Node.js + Express + ws |
| **AI** | @github/copilot-sdk |
| **テスト** | Jest + ts-jest |
| **ログ** | 構造化ロギング (色付き出力) |
| **モニタリング** | メトリクス、ヘルスチェック |

## セットアップ

```bash
# 依存関係を一括インストール
npm run install:all

# .env.example をコピー
cp backend/.env.example backend/.env
```

## 開発サーバー起動

```bash
# バックエンド (port 3001) + フロントエンド (port 5173) を同時起動
npm run dev
```

ブラウザで http://localhost:5173 を開く。

## 個別起動

```bash
# バックエンドのみ
npm run dev:backend

# フロントエンドのみ
npm run dev:frontend
```

## ビルド

```bash
# フルビルド
npm run build

# バックエンドのみ
npm run build:backend

# フロントエンドのみ
npm run build:frontend
```

## テスト

```bash
# 全テスト実行
npm run test:backend

# ウォッチモード
npm run test:backend -- --watch

# カバレッジ測定
npm run test:backend -- --coverage
```

**テスト対象:**
- ✅ メッセージ検証 (JSON, サイズ, 内容)
- ✅ Origin 検証 (ホワイトリスト)
- ✅ ロギング (ログレベル)
- ✅ セッション管理 (追加、削除、サイズ)

## REST API

### ヘルスチェック

```bash
# サーバー稼働確認
curl http://localhost:3001/health/live

# 初期化完了確認
curl http://localhost:3001/health/ready
```

### メトリクス

```bash
# メトリクス取得
curl http://localhost:3001/metrics
```

**レスポンス例:**
```json
{
  "activeConnections": 2,
  "totalMessages": 45,
  "totalErrors": 1,
  "uptime": 3600000,
  "timestamp": "2025-04-21T09:50:46.063Z"
}
```

### デバッグ

```bash
# ステータス確認
curl http://localhost:3001/debug/status

# ブラウザ用デバッグページ
curl http://localhost:3001/debug/info
```

## WebSocket プロトコル

詳細は [API.md](./API.md) を参照してください。

### クライアント → サーバー

```json
{ "type": "chat", "content": "ユーザーの質問" }
{ "type": "ping" }
```

### サーバー → クライアント

```json
{ "type": "delta", "content": "..." }      // ストリーミング
{ "type": "done" }                          // 完了
{ "type": "error", "message": "..." }      // エラー
{ "type": "pong" }                          // ping応答
```

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | 3001 | バックエンドポート |
| `COPILOT_MODEL` | gpt-5.4 | 使用するAIモデル |
| `CORS_ORIGINS` | http://localhost:5173 | 許可するオリジン |
| `LOG_LEVEL` | info | ログレベル |
| `SESSION_IDLE_TIMEOUT` | 600000ms | アイドルタイムアウト |

詳細は [backend/.env.example](./backend/.env.example) を参照してください。

## 認証

GitHub Copilot の認証は以下の方法のいずれかで自動的に行われます:

- `COPILOT_GITHUB_TOKEN` 環境変数
- `GH_TOKEN` または `GITHUB_TOKEN` 環境変数
- `copilot` CLI でログイン済みのセッション

## セキュリティ機能

- ✅ **Origin 検証**: ホワイトリストベースのCORS
- ✅ **入力検証**: JSON型チェック、サイズ制限、内容スキャン
- ✅ **エラー隠蔽**: スタックトレース非露出
- ✅ **型安全性**: TypeScript strict mode
- ✅ **ハートビート**: NAT/ファイアウォール対策

## ファイル構成

```
2.copilotWebRelay/
├── backend/
│   ├── src/
│   │   ├── server.ts          # メインサーバー
│   │   ├── config.ts          # 設定管理
│   │   ├── logger.ts          # ロギング
│   │   ├── types.ts           # 型定義
│   │   ├── validation.ts      # 入力検証
│   │   ├── metrics.ts         # メトリクス
│   │   ├── session-manager.ts # セッション管理
│   │   ├── handlers.ts        # イベントハンドラー
│   │   ├── constants.ts       # 定数
│   │   └── __tests__/         # テスト
│   ├── .env.example           # 環境変数例
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # メインコンポーネント
│   │   ├── useChat.ts         # チャットフック
│   │   ├── useWebSocket.ts    # WebSocketフック
│   │   ├── App.css
│   │   └── main.tsx
│   └── package.json
├── API.md                     # API ドキュメント
└── README.md
```

## 改善ロードマップ

### Phase 1: セキュリティ ✅
- [x] Origin 検証
- [x] 入力値検証
- [x] エラー安全化
- [x] 型定義整理
- [x] strict mode 有効化
- [x] race condition 修正

### Phase 2: アーキテクチャ ✅
- [x] モジュール分割 (config, logger, types, validation, handlers)
- [x] カスタムフック化 (useChat, useWebSocket)
- [x] セッション管理 (SessionManager)
- [x] メトリクス収集 (Metrics)
- [x] ヘルスチェックエンドポイント
- [x] 定数ファイル

### Phase 3: テスト・ドキュメント ✅
- [x] Jest 設定
- [x] ユニットテスト (validation, logger, session-manager)
- [x] API ドキュメント
- [x] .env.example 作成
- [x] README 充実

### Phase 4: 今後の改善案
- [ ] E2E テスト (Playwright)
- [ ] レート制限 (per IP, per token)
- [ ] データベース連携 (メッセージ履歴保存)
- [ ] 認証トークン検証 (WebSocket層)
- [ ] セッションタイムアウト実装
- [ ] Docker コンテナ化
- [ ] CI/CD パイプライン
- [ ] 負荷テスト・パフォーマンス最適化

## トラブルシューティング

### "切断中" が表示されたままの場合

1. バックエンドが起動しているか確認:
   ```bash
   curl http://localhost:3001/health/live
   ```

2. ブラウザ開発者ツールで WebSocket エラーを確認

3. CORS 設定を確認:
   ```bash
   echo $CORS_ORIGINS
   ```

### メッセージが送受信できない場合

1. ネットワークタブで WebSocket フレームを確認

2. バックエンドログでエラーメッセージを確認:
   ```bash
   LOG_LEVEL=debug npm run dev:backend
   ```

3. Copilot 認証状態を確認:
   ```bash
   gh auth status
   ```

## ライセンス

MIT

## 参考資料

- [GitHub Copilot SDK](https://github.com/github/copilot-sdk)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Jest テストフレームワーク](https://jestjs.io/)

