# データモデル

Pomodoro ゲーミフィケーションアプリはデータベースを使用しません。サーバー側の永続化はファイル（`pomodoro_state.json`）を使用し、クライアント側は `localStorage` に同一のオブジェクトを保存します。

---

## サーバー側定数

`app.py` で定義される定数です。`HTML_TEMPLATE` によって HTML 内の JavaScript に埋め込まれます。

| 定数名 | 型 | 値 | 説明 |
|--------|----|----|------|
| `XP_PER_FOCUS` | `int` | `25` | 集中セッション完了時に獲得できる XP |
| `XP_PER_LEVEL` | `int` | `100` | 1 レベルアップに必要な累積 XP |
| `FOCUS_MINUTES` | `int` | `25` | 集中セッションの時間（分） |

---

## 状態オブジェクト

ブラウザの `localStorage` とサーバーの `pomodoro_state.json` に保存される JSON オブジェクトです。

| フィールド | 型 | 説明 |
|------------|-----|------|
| `totalXP` | `number` | 累積 XP（集中セッション完了ごとに `XP_PER_FOCUS` 加算） |
| `completed` | `number` | 集中セッション完了数の累計 |
| `attempted` | `number` | セッション試行数の累計（完了・未完了含む） |
| `totalFocusMinutes` | `number` | 累積集中時間（分） |
| `history` | `HistoryItem[]` | セッション履歴の配列 |
| `streak` | `number` | 現在の連続完了日数 |
| `maxStreak` | `number` | 過去最大の連続完了日数 |
| `lastCompletionDate` | `string \| null` | 最後に集中セッションを完了した日付（`"YYYY-MM-DD"` 形式） |
| `badges` | `string[]` | 獲得済みバッジ ID の配列 |
| `updatedAt` | `string` | 最終更新タイムスタンプ（ISO 8601）。サーバーへの保存時に自動付与 |

---

## HistoryItem（履歴エントリ）

`history` 配列の各要素の構造です。

| フィールド | 型 | 説明 |
|------------|-----|------|
| `ts` | `string` | セッション記録時刻（ISO 8601 タイムスタンプ） |
| `completed` | `boolean` | 集中セッションとして完了したかどうか |
| `focusMinutes` | `number` | 完了時は `FOCUS_MINUTES`（25）、未完了時は `0` |

---

## バッジ定義

| バッジ ID | タイトル | 解放条件 |
|----------|---------|---------|
| `streak_3` | 3日連続完了 | `streak >= 3` |
| `week_10` | 今週10回完了 | 過去 7 日間の完了済みセッション数 >= 10 |

---

## レベル計算

| 計算項目 | 式 |
|--------|-----|
| レベル | `floor(totalXP / XP_PER_LEVEL) + 1` |
| 現レベル内の進捗 XP | `totalXP % XP_PER_LEVEL` |
| 次レベルに必要な XP | `XP_PER_LEVEL`（固定） |

---

## ストリーク計算ルール

- `lastCompletionDate` から今日までの日数差 (`gap`) が `> 1` の場合、ストリークは 0 にリセットされる。
- 当日に初めて完了した場合（`gap == 1`）は `streak += 1`。
- 同日に複数回完了した場合（`gap <= 0`）は `streak` を変更しない（ただし最小値 1）。
- 初めて完了した場合（`lastCompletionDate == null`）は `streak = 1`。
