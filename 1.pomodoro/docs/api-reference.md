# API リファレンス

## エンドポイント一覧

Pomodoro アプリは単一の HTTP エンドポイントを提供します。REST API や JSON レスポンスは存在せず、HTML ページを直接配信します。

---

### `GET /`

ポモドーロタイマーの Web ページを返します。

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

#### レスポンス例（抜粋）

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <title>Pomodoro Visual Feedback</title>
  ...
</head>
<body class="mode-focus">
  ...
</body>
</html>
```

HTML ページには CSS・JavaScript がすべてインラインで含まれており、追加のリソース取得は発生しません。

---

## サーバー設定

| 設定項目 | 値 |
|--------|-----|
| バインドアドレス | `127.0.0.1` |
| デフォルトポート | `8000` |
| プロトコル | HTTP/1.0 |

`run_server(port)` 関数の引数でポート番号を変更できます。
