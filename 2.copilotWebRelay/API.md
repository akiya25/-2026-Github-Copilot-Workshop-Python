# Copilot Web Relay - API ドキュメント

## 概要

Copilot Web Relay は、GitHub Copilot SDK を使用したWebSocketベースの AI チャットアプリケーションです。

### サポートされているプロトコル

- **REST API**: ヘルスチェック、メトリクス、デバッグエンドポイント
- **WebSocket**: リアルタイムチャット通信（ストリーミング対応）

---

## REST API

### ヘルスチェック

#### GET `/health/live`

サーバーが稼働中であることを確認します。

**レスポンス（200 OK）:**
```json
{
  "status": "alive"
}
```

**使用例:**
```bash
curl http://localhost:3001/health/live
```

---

#### GET `/health/ready`

サーバーが完全に初期化されたことを確認します。

**レスポンス（200 OK）:**
```json
{
  "status": "ready",
  "websocket": "configured",
  "model": "gpt-5.4",
  "sessions": 0
}
```

**使用例:**
```bash
curl http://localhost:3001/health/ready
```

---

### メトリクス

#### GET `/metrics`

システムメトリクスを取得します。

**レスポンス（200 OK）:**
```json
{
  "activeConnections": 2,
  "totalMessages": 45,
  "totalErrors": 1,
  "uptime": 3600000,
  "timestamp": "2025-04-21T09:50:46.063Z"
}
```

**フィールド:**
- `activeConnections`: アクティブなWebSocket接続数
- `totalMessages`: 処理されたメッセージ総数
- `totalErrors`: 発生したエラー総数
- `uptime`: サーバー稼働時間（ミリ秒）
- `timestamp`: メトリクス取得時刻

**使用例:**
```bash
curl http://localhost:3001/metrics
```

---

### デバッグエンドポイント

#### GET `/debug/status`

デバッグ情報を取得します。

**レスポンス（200 OK）:**
```json
{
  "status": "ok",
  "websocket": "ready",
  "model": "gpt-5.4",
  "env": "development",
  "activeSessions": 1
}
```

---

#### GET `/debug/info`

ブラウザ用のデバッグ情報ページを返します。

---

## WebSocket API

### 接続

```javascript
const ws = new WebSocket('ws://localhost:3001');
// または HTTPS環境:
// const ws = new WebSocket('wss://example.com/ws');
```

### メッセージプロトコル

#### クライアント → サーバー

##### チャットメッセージ

```json
{
  "type": "chat",
  "content": "ユーザーの質問またはメッセージ"
}
```

**制約:**
- `type`: 必須、値は "chat"
- `content`: 必須、文字列、1-2000文字
- メッセージサイズ: 最大4096バイト

**エラーレスポンス:**
```json
{
  "type": "error",
  "message": "Invalid input: content cannot be empty"
}
```

---

##### ハートビート（ping）

```json
{
  "type": "ping"
}
```

サーバー側は `pong` で応答します。

**使用目的:**
- 接続の確認
- NAT/ファイアウォールによる接続切断対策

---

#### サーバー → クライアント

##### ストリーミングレスポンス（delta）

```json
{
  "type": "delta",
  "content": "レスポンスの一部"
}
```

複数回送信されます（ストリーミング）。

**例:**
```json
{"type":"delta","content":"これ"}
{"type":"delta","content":"は"}
{"type":"delta","content":"ストリーミング"}
```

---

##### 完了通知（done）

```json
{
  "type": "done"
}
```

Copilot の応答が完了したことを示します。

**フロー例:**
1. クライアント: `{"type":"chat","content":"..."}`
2. サーバー: `{"type":"delta","content":"..."}` (複数回)
3. サーバー: `{"type":"done"}`

---

##### エラー（error）

```json
{
  "type": "error",
  "message": "エラーの説明"
}
```

**可能なエラーメッセージ:**
- `Invalid input: ...` - メッセージ検証エラー
- `Session not ready` - セッション初期化中
- `Session error occurred` - Copilot SDK エラー
- `Failed to initialize session` - セッション作成失敗

---

##### ハートビート応答（pong）

```json
{
  "type": "pong"
}
```

クライアントの ping に対する応答。

---

### WebSocket イベントハンドリング

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onopen = () => {
  console.log('接続成功');
  ws.send(JSON.stringify({
    type: 'chat',
    content: 'こんにちは'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'delta':
      console.log('受信:', message.content);
      break;
    case 'done':
      console.log('完了');
      break;
    case 'error':
      console.error('エラー:', message.message);
      break;
    case 'pong':
      console.log('ping応答');
      break;
  }
};

ws.onerror = (err) => {
  console.error('エラー:', err);
};

ws.onclose = () => {
  console.log('切断');
};
```

---

## セッションライフサイクル

```
クライアント接続
    ↓
セッション初期化（自動）
    ↓
ユーザーがメッセージを送信
    ↓
Copilot がストリーミングで応答開始
    ↓
複数の delta メッセージ受信
    ↓
done メッセージで応答完了
    ↓
別のメッセージを送信可能（ステップ3へ）
    ↓
クライアント切断 or タイムアウト
    ↓
セッション終了
```

---

## CORS 設定

デフォルトでは `http://localhost:5173` からの接続のみを許可します。

本番環境では環境変数 `CORS_ORIGINS` で設定:

```bash
CORS_ORIGINS=https://example.com,https://app.example.com
```

---

## エラーハンドリング

### クライアント側の推奨実装

```javascript
function handleWebSocketError(message) {
  // キー情報のみを表示（詳細情報は隠す）
  if (message.includes('Invalid input')) {
    showUserError('メッセージ形式が正しくありません');
  } else if (message.includes('Session')) {
    showUserError('セッションエラーが発生しました。再接続してください');
  } else {
    showUserError('エラーが発生しました');
  }
}
```

---

## セキュリティノート

1. **Origin検証**: すべてのWebSocket接続はOriginチェックを受けます
2. **入力検証**: すべてのメッセージは型チェック、サイズ制限、内容検査を受けます
3. **エラー情報**: スタックトレースは隠され、一般的なメッセージのみ返却されます
4. **HTTPS環境**: 自動的に `wss://` (Secure WebSocket) を使用します

---

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `PORT` | 3001 | サーバーポート |
| `COPILOT_MODEL` | gpt-5.4 | 使用するAIモデル |
| `CORS_ORIGINS` | http://localhost:5173 | 許可するオリジン（カンマ区切り） |
| `LOG_LEVEL` | info | ログレベル（debug/info/warn/error） |
| `SESSION_IDLE_TIMEOUT` | 600000 | アイドルタイムアウト（ミリ秒） |

詳細は `.env.example` を参照してください。

---

## レート制限

現在のバージョンではレート制限は実装されていません。
本番環境での使用時には別途実装を推奨します。

---

## バージョン

- API バージョン: 1.0.0
- 最終更新: 2025-04-21
