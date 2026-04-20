# API リファレンス

ポモドーロタイマー Flask バックエンドの REST API 仕様です。

---

## ベース URL

```
http://localhost:5000
```

---

## エンドポイント一覧

### GET /

タイマー UI 画面（HTML）を返します。

**レスポンス**

- ステータス: `200 OK`
- Content-Type: `text/html`
- テンプレート: `templates/index.html`

---

### GET /api/stats/today

当日の集計統計を返します。

**レスポンス**

| フィールド | 型 | 説明 |
|---|---|---|
| `completedSessions` | integer | 当日完了した focus セッション数 |
| `focusMinutes` | integer | 当日の合計集中時間（分） |
| `lastUpdatedAt` | string | 最後のセッションの `completedAt`（ISO 8601 UTC）。セッションが0件の場合は現在時刻 |

**レスポンス例**

```json
{
  "completedSessions": 3,
  "focusMinutes": 75,
  "lastUpdatedAt": "2026-04-17T10:30:00Z"
}
```

- ステータス: `200 OK`

---

### POST /api/sessions

セッションを記録します。

**リクエストボディ（JSON）**

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `mode` | string | ✓ | タイマーモード。`focus` / `short_break` / `long_break` のいずれか |
| `duration` | integer | ✓ | セッション時間（秒）。60〜3600 の範囲 |
| `completed` | boolean | - | 完了フラグ（省略時は `true`） |
| `completedAt` | string | - | 完了時刻（ISO 8601 UTC）。省略時はサーバー現在時刻 |

**リクエスト例**

```json
{
  "mode": "focus",
  "duration": 1500,
  "completed": true,
  "completedAt": "2026-04-17T09:00:00Z"
}
```

**レスポンス（成功）**

| フィールド | 型 | 説明 |
|---|---|---|
| `id` | integer | 当日セッション内の連番 ID |
| `mode` | string | 指定したモード |
| `duration` | integer | 指定した時間（秒） |
| `completed` | boolean | 完了フラグ |
| `completedAt` | string | 完了時刻（ISO 8601 UTC） |

```json
{
  "id": 1,
  "mode": "focus",
  "duration": 1500,
  "completed": true,
  "completedAt": "2026-04-17T09:00:00Z"
}
```

- ステータス: `201 Created`

**エラーレスポンス**

| 条件 | ステータス | ボディ |
|---|---|---|
| `mode` が不正（または未指定） | `400 Bad Request` | `{"error": "Invalid mode"}` |
| `duration` が 60〜3600 範囲外（または非整数） | `400 Bad Request` | `{"error": "Invalid duration"}` |

---

### POST /api/reset-today

当日のセッションデータをすべて削除します。

**リクエストボディ**: 不要

**レスポンス**

```json
{
  "status": "reset",
  "stats": {
    "completedSessions": 0,
    "focusMinutes": 0,
    "lastUpdatedAt": "2026-04-17T10:00:00Z"
  }
}
```

- ステータス: `200 OK`

---

## バリデーションルール

| 項目 | ルール |
|---|---|
| `mode` | `focus`、`short_break`、`long_break` のみ許可 |
| `duration` | 整数かつ 60〜3600 秒の範囲 |

## データ保存

現在の実装では、セッションデータはサーバーのメモリ内（`sessions_db` 辞書）に保存されます。サーバー再起動時にデータは失われます。日付（`YYYY-MM-DD`）をキーとして当日のセッション一覧を保持します。
