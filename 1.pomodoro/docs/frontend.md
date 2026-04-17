# フロントエンドドキュメント

フロントエンドのコード（HTML / CSS / JavaScript）はすべて `app.py` の `build_html()` 関数内にインラインで記述されています。外部ファイルや外部ライブラリへの依存はありません。

---

## HTML 構造

```
body.mode-focus
├── div.focus-bg          # 集中モード時の背景エフェクト (aria-hidden)
└── main.panel            # メインパネル
    ├── div.mode-switch   # モード切替ボタン群
    │   ├── button#focusBtn   (Focus 25m)
    │   └── button#breakBtn   (Break 5m)
    ├── div.ring-wrap     # プログレスリング
    │   ├── svg           # SVG リング (viewBox="0 0 120 120")
    │   │   ├── circle.track      # 背景トラック (r=52)
    │   │   └── circle.progress#progressCircle  # 進捗リング
    │   └── div.time#timeText     # 残り時間テキスト
    ├── div.status#statusText     # ステータスメッセージ
    └── div.controls      # 操作ボタン群
        ├── button#startBtn  (Start)
        ├── button#pauseBtn  (Pause)
        └── button#resetBtn  (Reset)
```

---

## CSS コンポーネント

### CSS カスタムプロパティ（変数）

| 変数 | 初期値 | 説明 |
|------|--------|------|
| `--bg` | `#0f172a` | ページ背景色 |
| `--surface` | `rgba(15,23,42,0.78)` | パネル背景色 |
| `--text` | `#e2e8f0` | テキスト色 |
| `--color-calm` | `#4da3ff` | 残り時間75%超のリング色 |
| `--color-steady` | `#47d7ac` | 残り時間50〜75%のリング色 |
| `--color-mid` | `#ffd166` | 残り時間25〜50%のリング色 |
| `--color-danger` | `#ff5d73` | 残り時間25%以下のリング色 |
| `--ring-color` | `var(--color-calm)` | 現在のリング色（JS で動的更新） |
| `--ring-size` | `min(66vw, 340px)` | リングの表示サイズ |
| `--ring-stroke` | `14` | リングの線幅 |

### アニメーション

| アニメーション名 | 対象 | 説明 |
|---------------|------|------|
| `drift` | `.focus-bg::after` | ドットパターンのゆっくりした移動 |
| `pop` | `.burst` | タイマー完了時の爆発ドット |

### アクセシビリティ

`prefers-reduced-motion: reduce` メディアクエリが適用されている場合、すべてのアニメーション・トランジションが無効化されます。

---

## JavaScript 関数

### `easeOutSine(x)`

進捗リングの描画に使用するイージング関数。

```javascript
function easeOutSine(x) { return Math.sin((x * Math.PI) / 2); }
```

| 引数 | 型 | 説明 |
|------|----|------|
| `x` | `number` | 0〜1 の線形進捗値 |
| 戻り値 | `number` | イージング後の 0〜1 の値 |

`prefers-reduced-motion` が有効な場合、イージングは適用されず線形値がそのまま使用されます。

---

### `formatTime(ms)`

ミリ秒を `MM:SS` 形式の文字列に変換します。

```javascript
function formatTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
```

| 引数 | 型 | 説明 |
|------|----|------|
| `ms` | `number` | ミリ秒 |
| 戻り値 | `string` | `"MM:SS"` 形式の文字列 |

---

### `colorByRatio(ratio)`

残り時間の割合に応じた CSS カラー変数名を返します。

| ratio の範囲 | 戻り値 |
|-------------|--------|
| > 0.75 | `'var(--color-calm)'` |
| > 0.5 | `'var(--color-steady)'` |
| > 0.25 | `'var(--color-mid)'` |
| ≤ 0.25 | `'var(--color-danger)'` |

---

### `setMode(nextMode)`

タイマーモードを切り替えます。タイマーを停止して初期状態にリセットします。

| 引数 | 型 | 値 |
|------|----|-----|
| `nextMode` | `string` | `'focus'` または `'break'` |

処理内容：
1. `mode`・`total`・`remainingMs`・`baseMs` を更新
2. 実行中のタイマーを停止 (`cancelAnimationFrame`)
3. `body.mode-focus` クラスを切り替え
4. ボタンの `primary` クラスを切り替え
5. ステータステキストを更新
6. `render()` を呼び出して UI を描画

---

### `render()`

現在の `remainingMs` に基づいて UI を更新します。

処理内容：
1. `ratio = remainingMs / (total * 1000)` を計算
2. `easeOutSine(ratio)` でイージングを適用（`reduceMotion` が false の場合）
3. SVG プログレスリングの `strokeDashoffset` を更新
4. `--ring-color` CSS 変数を `colorByRatio(ratio)` で更新
5. `timeText` の表示を更新
6. `statusText` を更新（完了時は `'完了！お疲れさまでした'`）

プログレスリングの計算：
```
circumference = 2 * π * 52 ≈ 326.73
strokeDashoffset = circumference * (1 - eased)
```

---

### `burst()`

タイマー完了時に26個のドットを放射状に飛ばすアニメーションを実行します。

`prefers-reduced-motion` が有効な場合は何もしません。

| 定数 | 値 | 説明 |
|------|----|------|
| `BURST_DOT_COUNT` | `26` | ドット数 |
| `MIN_BURST_DISTANCE` | `80` | 最小飛散距離（px） |
| `BURST_DISTANCE_RANGE` | `140` | 飛散距離のランダム幅（px） |

使用色：`#4da3ff`、`#47d7ac`、`#ffd166`、`#ff5d73`

---

### `tick(now)`

`requestAnimationFrame` のコールバック関数。タイマーが動作中の間、毎フレーム呼ばれます。

1. `remainingMs = baseMs - (now - startEpoch)` を計算
2. `render()` を呼び出して UI を更新
3. 残り時間が 0 以下になったら `burst()` を呼び出して終了
4. それ以外は `requestAnimationFrame(tick)` で次フレームをスケジュール

---

## ボタンイベントハンドラー

| ボタン | イベント | 動作 |
|--------|---------|------|
| `startBtn` | `click` | タイマーを開始（`isRunning=true` かつ `remainingMs>0` の場合のみ） |
| `pauseBtn` | `click` | タイマーを一時停止（`isRunning=false`、`cancelAnimationFrame`） |
| `resetBtn` | `click` | `setMode(mode)` で現在モードをリセット |
| `focusBtn` | `click` | `setMode('focus')` |
| `breakBtn` | `click` | `setMode('break')` |
