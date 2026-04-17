# アーキテクチャ概要

## 概要

Pomodoro ゲーミフィケーションアプリは、Python 標準ライブラリの `http.server` を使用したシングルファイル構成の Web アプリケーションです。Flask などの外部フレームワークには依存せず、HTML / CSS / JavaScript をすべて `app.py` 内で生成・配信します。ゲーミフィケーション状態（XP・ストリーク・バッジ等）はサーバー側ファイル（`pomodoro_state.json`）とブラウザ側 `localStorage` の両方で同期して永続化します。

## ファイル構成

```
1.pomodoro/
├── app.py                  # HTTPサーバー本体・ゲーミフィケーションロジック・HTML生成
├── pomodoro_state.json     # サーバー側状態永続化ファイル（自動生成）
├── test_gamification.py    # ゲーミフィケーションロジックのユニットテスト
└── docs/                   # ドキュメント
```

## コンポーネント構成

```
app.py
├── 定数
│   ├── XP_PER_FOCUS = 25      # 集中セッション完了時の獲得XP
│   ├── XP_PER_LEVEL = 100     # 1レベルアップに必要なXP
│   └── FOCUS_MINUTES = 25     # 集中セッションの時間（分）
├── ゲーミフィケーションロジック
│   ├── calculate_level(total_xp)               # レベル・進捗XP計算
│   ├── calculate_streak(last_completion, ...)   # 現在ストリーク計算
│   └── update_streak_on_completion(...)         # セッション完了時のストリーク更新
├── 状態永続化
│   ├── _load_server_state()   # pomodoro_state.json から状態を読み込む
│   └── _save_server_state()   # pomodoro_state.json へ状態を書き込む（updatedAt自動付与）
├── HTML_TEMPLATE / HTML        # 定数値を埋め込んだ自己完結型HTMLページ
├── Handler                     # HTTPリクエストハンドラー
│   ├── do_GET()                # GET / および GET /api/state を処理
│   └── do_POST()               # POST /api/state を処理
└── run_server(port=8000)       # HTTPサーバーを起動
```

## 技術スタック

| レイヤー | 技術 |
|--------|------|
| サーバー | Python `http.server` (標準ライブラリ) |
| フロントエンド | HTML / CSS / JavaScript (インライン、外部依存なし) |
| 状態永続化 | サーバー側: `pomodoro_state.json` / クライアント側: `localStorage` |
| テスト | Python `unittest` (標準ライブラリ) |

## サーバー起動

```bash
python app.py
```

デフォルトで `http://127.0.0.1:8000` にて起動します。

## 設計上の特徴

- **シングルファイル構成**: すべてのロジックが `app.py` 一ファイルに集約されており、外部依存なしで動作する。
- **HTML テンプレート埋め込み**: `HTML_TEMPLATE` の文字列テンプレートに定数値（`XP_PER_FOCUS`, `XP_PER_LEVEL`, `FOCUS_MINUTES`）を埋め込んでクライアントに配信する。
- **デュアル状態同期**: ブラウザ側（`localStorage`）とサーバー側（`pomodoro_state.json`）の両方に状態を保存し、`updatedAt` タイムスタンプの比較によって新しい方を優先してロードする。
- **REST API**: `GET /api/state` で状態取得、`POST /api/state` で状態保存を行うシンプルな JSON API を提供する。
