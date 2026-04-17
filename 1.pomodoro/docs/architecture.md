# アーキテクチャ概要

## 概要

Pomodoro タイマーは、Python 標準ライブラリの `http.server` を使用したシングルファイル構成の Web アプリケーションです。Flask などの外部フレームワークには依存せず、HTML / CSS / JavaScript をすべて `app.py` 内で生成・配信します。

## ファイル構成

```
1.pomodoro/
├── app.py          # HTTPサーバー本体・HTML生成ロジック
├── test_app.py     # ユニットテスト
└── docs/           # ドキュメント
```

## コンポーネント構成

```
app.py
├── 定数
│   ├── FOCUS_SECONDS = 1500  (25分)
│   └── BREAK_SECONDS = 300   (5分)
├── build_html()              # 自己完結型HTMLページを生成
├── PomodoroHandler           # HTTPリクエストハンドラー
│   └── do_GET()              # GET / に対してHTMLを返す
└── run_server(port=8000)     # HTTPサーバーを起動
```

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| サーバー | Python `http.server` (標準ライブラリ) |
| フロントエンド | HTML / CSS / JavaScript (インライン、外部依存なし) |
| テスト | Python `unittest` (標準ライブラリ) |

## サーバー起動

```bash
python app.py
```

デフォルトで `http://127.0.0.1:8000` にて起動します。

## 設計上の特徴

- **シングルファイル構成**: すべてのロジックが `app.py` 一ファイルに集約されており、外部依存なしで動作する。
- **HTML 動的生成**: `build_html()` が Python の文字列テンプレートで HTML を生成し、定数値 (`FOCUS_SECONDS`, `BREAK_SECONDS`) を埋め込む。
- **ステートレスサーバー**: サーバー側にはタイマー状態を持たず、すべての状態管理はブラウザ側の JavaScript で行う。
