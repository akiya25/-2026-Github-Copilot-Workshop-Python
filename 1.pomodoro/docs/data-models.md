# データモデル仕様

ポモドーロタイマーで使用するデータ構造の仕様です。

---

## タイマー状態（フロントエンド）

`timerReducer.js` で管理される状態オブジェクトです。

```javascript
{
  status: string,       // タイマーの状態（後述）
  mode: string,         // 現在のモード（後述）
  currentTime: number,  // 残り時間（秒）
  targetTime: number | null,  // 終了予定時刻（UNIX timestamp 秒）。停止中は null
  totalSessions: number // 今日完了した focus セッション数（クライアント側カウント）
}
```

### タイマー状態（`status`）

| 値 | 説明 |
|---|---|
| `idle` | 未開始（初期状態） |
| `running` | カウントダウン中 |
| `paused` | 一時停止中 |
| `finished` | タイムアップ後の完了状態 |

### タイマーモード（`mode`）

| 値 | 説明 | 時間 |
|---|---|---|
| `focus` | 集中セッション | 1500 秒（25 分） |
| `short_break` | 短休憩 | 300 秒（5 分） |
| `long_break` | 長休憩 | 900 秒（15 分） |

COMPLETE アクション時のモード遷移: `focus → short_break → focus → ...`

---

## セッション記録（サーバー側）

`POST /api/sessions` で作成・保存されるセッションオブジェクトです。

```python
{
    "id": int,           # 当日の連番 ID（1 から始まる）
    "mode": str,         # "focus" | "short_break" | "long_break"
    "duration": int,     # セッション時間（秒）
    "completed": bool,   # 完了フラグ
    "completedAt": str   # 完了時刻（ISO 8601 UTC 形式）
}
```

### バリデーションルール

| フィールド | 制約 |
|---|---|
| `mode` | `focus` / `short_break` / `long_break` のいずれか |
| `duration` | 整数かつ 60〜3600 の範囲 |
| `completed` | 省略可。省略時は `True` |
| `completedAt` | 省略可。省略時はサーバー現在時刻（UTC） |

---

## 当日統計（サーバー側）

`GET /api/stats/today` が返す統計オブジェクトです。

```python
{
    "completedSessions": int,  # 完了した focus セッション数（completed=True のみ）
    "focusMinutes": int,       # 合計集中時間（秒 ÷ 60）
    "lastUpdatedAt": str       # 最後のセッションの completedAt。セッションが 0 件の場合は現在時刻
}
```

---

## localStorage データ構造（クライアント側）

`sessionRepository.js` が管理する localStorage のデータです。

### キー: `sessions_today`

```json
{
  "date": "2026-04-17",
  "completedFocusSessions": [
    "2026-04-17T09:00:00.000Z",
    "2026-04-17T09:30:00.000Z"
  ]
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| `date` | string | `YYYY-MM-DD` 形式の日付 |
| `completedFocusSessions` | string[] | 完了した focus セッションの `completedAt` タイムスタンプ配列 |

日付が変わった場合（`date !== today`）は自動的に空レコードにリセットされます。

---

## 定数定義（`constants.js`）

### `TIMER_MODES`

```javascript
{
  FOCUS:       { key: 'focus',       label: '集中',   labelJa: '作業中',   time: 1500 },
  SHORT_BREAK: { key: 'short_break', label: '短休憩', labelJa: '休憩中',   time: 300  },
  LONG_BREAK:  { key: 'long_break',  label: '長休憩', labelJa: '長休憩中', time: 900  }
}
```

### `TIMER_ACTIONS`

| アクション | 遷移 |
|---|---|
| `START` | `idle` / `finished` → `running` |
| `PAUSE` | `running` → `paused` |
| `RESUME` | `paused` → `running` |
| `RESET` | 任意 → `idle`（初期状態に完全リセット） |
| `TICK` | `running` 状態で `currentTime` を更新 |
| `COMPLETE` | `running` → `finished`（モード自動切替・セッションカウント） |
| `SWITCH_MODE` | モードを直接切り替える（定数定義のみ。`timerReducer` では未実装） |

### `STORAGE_KEYS`

| キー | 値 | 説明 |
|---|---|---|
| `SESSIONS_TODAY` | `"sessions_today"` | 当日のセッション記録 |
| `TIMER_SETTINGS` | `"timer_settings"` | ユーザー設定（将来用） |
| `LAST_SYNC_AT` | `"last_sync_at"` | 最終サーバー同期時刻（将来用） |
