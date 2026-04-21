# Copilot Web Relay - AI チャット Web アプリ

GitHub Copilot SDK を使ったリアルタイム AI チャット Web アプリケーション。

## アーキテクチャ

```
ブラウザ (React + Vite)
    ↕ WebSocket
バックエンド (Node.js + Express)
    ↕ JSON-RPC
Copilot CLI (SDK が自動管理)
    ↕
GitHub Copilot API
```

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React 18 + TypeScript + Vite |
| Markdown | react-markdown + remark-gfm |
| バックエンド | Node.js + Express + ws |
| AI | @github/copilot-sdk (gpt-5) |
| 同時起動 | concurrently |

## セットアップ

```bash
# 依存関係を一括インストール
npm run install:all
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
npm run build
```

## WebSocket プロトコル

**クライアント → サーバー**
```json
{ "type": "chat", "content": "ユーザーの質問" }
```

**サーバー → クライアント**
```json
{ "type": "delta", "content": "..." }  // ストリーミングチャンク
{ "type": "done" }                      // 完了通知
{ "type": "error", "message": "..." }   // エラー
```

## 認証

GitHub Copilot の認証は以下の方法のいずれかで行う:
- `COPILOT_GITHUB_TOKEN` 環境変数
- `GH_TOKEN` または `GITHUB_TOKEN` 環境変数
- `copilot` CLI でログイン済みのセッション
