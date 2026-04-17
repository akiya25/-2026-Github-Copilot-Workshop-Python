# API リファレンス

## エンドポイント一覧

Pomodoro ゲーミフィケーションアプリは以下の HTTP エンドポイントを提供します。

---

### `GET /`

ポモドーロゲーミフィケーションの Web ページを返します。

#### リクエスト

```
GET / HTTP/1.1
Host: 127.0.0.1:8000
```

パラメーター・リクエストボディは不要です。

#### レスポンス

| 項目 | 値 |
|------|-----|
| ステータスコード | `200 OK` |
| `Content-Type` | `text/html; charset=utf-8` |
| ボディ | 自己完結型 HTML ページ |

HTML ページには CSS・JavaScript がすべてインラインで含まれており、追加のリソース取得は発生しません。

---

### `GET /api/state`

サーバーに保存されている現在のゲーミフィケーション状態を JSON で返します。

#### リクエスト

```
GET /api/state HTTP/1.1
Host: 127.0.0.1:8000
```

#### レスポンス

| 項目 | 値 |
|------|-----|
| ステータスコード | `200 OK` |
| `Content-Type` | `application/json; charset=utf-8` |
| ボディ | JSON オブジェクト（状態データ） |

#### レスポンス例

```json
{
  "totalXP": 275,
  "completed": 11,
  "attempted": 13,
  "totalFocusMinutes": 275,
  "history": [
    { "ts": "2026-04-17T09:00:00.000Z", "completed": true, "focusMinutes": 25 }
  ],
  "streak": 3,
  "maxStreak": 5,
  "lastCompletionDate": "2026-04-17",
  "badges": ["streak_3"],
  "updatedAt": "2026-04-17T09:00:00.000000Z"
}
```

状態ファイル（`pomodoro_state.json`）が存在しない場合は `{"updatedAt": ""}` を返します。

---

### `POST /api/state`

ゲーミフィケーション状態をサーバーに保存します。

#### リクエスト

```
POST /api/state HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json
```

リクエストボディには状態オブジェクト（JSON）を指定します。サーバーは受信時に `updatedAt` フィールドを現在の UTC 時刻で上書きして保存します。

#### リクエスト例

```json
{
  "totalXP": 300,
  "completed": 12,
  "attempted": 14,
  "totalFocusMinutes": 300,
  "history": [],
  "streak": 4,
  "maxStreak": 5,
  "lastCompletionDate": "2026-04-17",
  "badges": ["streak_3"]
}
```

#### レスポンス

| 条件 | ステータスコード |
|------|----------------|
| 正常保存 | `204 No Content` |
| JSON パースエラー / オブジェクト以外 | `400 Bad Request` |

---

## エラーレスポンス

存在しないパスへのリクエストは `404 Not Found` を返します（ボディなし）。

---

## サーバー設定

| 設定項目 | 値 |
|--------|-----|
| バインドアドレス | `127.0.0.1` |
| デフォルトポート | `8000` |
| プロトコル | HTTP/1.0 |

`run_server(port)` 関数の引数でポート番号を変更できます。
