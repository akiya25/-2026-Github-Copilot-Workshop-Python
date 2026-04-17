from http.server import BaseHTTPRequestHandler, HTTPServer

HTML = """
<!doctype html>
<html lang=\"ja\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Pomodoro Timer</title>
  <style>
    :root {
      --bg: #f5f7fb;
      --card: #ffffff;
      --text: #111827;
      --muted: #4b5563;
      --accent: #dc2626;
      --border: #d1d5db;
    }

    body.theme-dark {
      --bg: #111827;
      --card: #1f2937;
      --text: #f9fafb;
      --muted: #d1d5db;
      --accent: #f87171;
      --border: #374151;
    }

    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    h1, h2 {
      margin: 0 0 12px;
    }

    .timer {
      text-align: center;
    }

    .phase {
      font-size: 1.1rem;
      color: var(--muted);
      margin-bottom: 8px;
    }

    .time {
      font-size: clamp(2.8rem, 12vw, 6rem);
      font-weight: 700;
      letter-spacing: 2px;
      margin: 8px 0 16px;
    }

    .controls {
      display: flex;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    button {
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      border-radius: 8px;
      padding: 10px 14px;
      cursor: pointer;
      font-weight: 600;
    }

    button.primary {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
    }

    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 12px;
    }

    .field {
      display: grid;
      gap: 6px;
    }

    label {
      font-size: 0.95rem;
      color: var(--muted);
    }

    select, input[type=\"range\"] {
      width: 100%;
    }

    .switches {
      display: grid;
      gap: 6px;
    }

    .switches label {
      color: var(--text);
    }

    .stats {
      font-size: 1rem;
      color: var(--muted);
    }

    body.theme-focus .settings,
    body.theme-focus .controls button:not(.primary) {
      display: none;
    }
  </style>
</head>
<body>
  <main class=\"container\">
    <section class=\"card timer\">
      <h1>Pomodoro Timer</h1>
      <div id=\"phase\" class=\"phase\">集中</div>
      <div id=\"time\" class=\"time\">25:00</div>
      <div class=\"controls\">
        <button id=\"startPause\" class=\"primary\">開始</button>
        <button id=\"reset\">リセット</button>
        <button id=\"skip\">スキップ</button>
      </div>
    </section>

    <section class=\"card stats\">
      完了ポモドーロ数: <span id=\"completedCount\">0</span>
    </section>

    <section class=\"card settings\">
      <h2>設定</h2>
      <div class=\"settings-grid\">
        <div class=\"field\">
          <label for=\"focusMinutes\">集中時間（分）</label>
          <select id=\"focusMinutes\">
            <option value=\"15\">15</option>
            <option value=\"25\">25</option>
            <option value=\"35\">35</option>
            <option value=\"45\">45</option>
          </select>
        </div>

        <div class=\"field\">
          <label for=\"shortBreakMinutes\">短休憩（分）</label>
          <select id=\"shortBreakMinutes\">
            <option value=\"5\">5</option>
            <option value=\"10\">10</option>
            <option value=\"15\">15</option>
          </select>
        </div>

        <div class=\"field\">
          <label for=\"longBreakMinutes\">長休憩（分）</label>
          <select id=\"longBreakMinutes\">
            <option value=\"10\">10</option>
            <option value=\"15\">15</option>
            <option value=\"20\">20</option>
          </select>
        </div>

        <div class=\"field\">
          <label for=\"theme\">テーマ</label>
          <select id=\"theme\">
            <option value=\"light\">ライトモード</option>
            <option value=\"dark\">ダークモード</option>
            <option value=\"focus\">フォーカスモード</option>
          </select>
        </div>

        <div class=\"field\">
          <label for=\"volume\">音量: <span id=\"volumeValue\">60</span>%</label>
          <input id=\"volume\" type=\"range\" min=\"0\" max=\"100\" step=\"1\" />
        </div>

        <div class=\"field switches\">
          <label><input id=\"startSound\" type=\"checkbox\" /> 開始音</label>
          <label><input id=\"endSound\" type=\"checkbox\" /> 終了音</label>
          <label><input id=\"tickSound\" type=\"checkbox\" /> tick音</label>
        </div>
      </div>
    </section>
  </main>

  <script>
    const STORAGE_KEY = 'pomodoro.settings.v1';

    const defaults = {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      theme: 'light',
      startSound: true,
      endSound: true,
      tickSound: false,
      volume: 60,
      completedPomodoros: 0,
    };

    const els = {
      phase: document.getElementById('phase'),
      time: document.getElementById('time'),
      startPause: document.getElementById('startPause'),
      reset: document.getElementById('reset'),
      skip: document.getElementById('skip'),
      completedCount: document.getElementById('completedCount'),
      focusMinutes: document.getElementById('focusMinutes'),
      shortBreakMinutes: document.getElementById('shortBreakMinutes'),
      longBreakMinutes: document.getElementById('longBreakMinutes'),
      theme: document.getElementById('theme'),
      startSound: document.getElementById('startSound'),
      endSound: document.getElementById('endSound'),
      tickSound: document.getElementById('tickSound'),
      volume: document.getElementById('volume'),
      volumeValue: document.getElementById('volumeValue'),
    };

    let settings = loadSettings();
    let mode = 'focus';
    let remainingSeconds = settings.focusMinutes * 60;
    let timerId = null;
    let isRunning = false;

    function loadSettings() {
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return { ...defaults, ...parsed };
      } catch {
        return { ...defaults };
      }
    }

    function saveSettings() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }

    function applyTheme() {
      document.body.className = '';
      if (settings.theme === 'dark') {
        document.body.classList.add('theme-dark');
      }
      if (settings.theme === 'focus') {
        document.body.classList.add('theme-focus');
      }
    }

    function getModeLabel() {
      if (mode === 'focus') return '集中';
      if (mode === 'shortBreak') return '短休憩';
      return '長休憩';
    }

    function getModeSeconds() {
      if (mode === 'focus') return settings.focusMinutes * 60;
      if (mode === 'shortBreak') return settings.shortBreakMinutes * 60;
      return settings.longBreakMinutes * 60;
    }

    function updateView() {
      const m = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
      const s = String(remainingSeconds % 60).padStart(2, '0');
      els.phase.textContent = getModeLabel();
      els.time.textContent = `${m}:${s}`;
      els.startPause.textContent = isRunning ? '一時停止' : '開始';
      els.completedCount.textContent = String(settings.completedPomodoros);
      els.volumeValue.textContent = String(settings.volume);
    }

    function initControlsFromSettings() {
      els.focusMinutes.value = String(settings.focusMinutes);
      els.shortBreakMinutes.value = String(settings.shortBreakMinutes);
      els.longBreakMinutes.value = String(settings.longBreakMinutes);
      els.theme.value = settings.theme;
      els.startSound.checked = !!settings.startSound;
      els.endSound.checked = !!settings.endSound;
      els.tickSound.checked = !!settings.tickSound;
      els.volume.value = String(settings.volume);
    }

    function beep(kind) {
      const enabled =
        (kind === 'start' && settings.startSound) ||
        (kind === 'end' && settings.endSound) ||
        (kind === 'tick' && settings.tickSound);
      if (!enabled || settings.volume <= 0) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = kind === 'tick' ? 500 : kind === 'start' ? 880 : 660;
      gain.gain.value = settings.volume / 100 * (kind === 'tick' ? 0.05 : 0.12);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + (kind === 'tick' ? 0.03 : 0.1));
      oscillator.onended = () => ctx.close();
    }

    function nextMode() {
      if (mode === 'focus') {
        settings.completedPomodoros += 1;
        mode = settings.completedPomodoros % 4 === 0 ? 'longBreak' : 'shortBreak';
      } else {
        mode = 'focus';
      }
      saveSettings();
      remainingSeconds = getModeSeconds();
      updateView();
    }

    function tick() {
      if (!isRunning) return;
      if (remainingSeconds > 0) {
        remainingSeconds -= 1;
        if (remainingSeconds > 0 && remainingSeconds <= 5) {
          beep('tick');
        }
        updateView();
        return;
      }
      beep('end');
      nextMode();
    }

    function start() {
      if (isRunning) return;
      isRunning = true;
      beep('start');
      timerId = setInterval(tick, 1000);
      updateView();
    }

    function pause() {
      if (!isRunning) return;
      isRunning = false;
      if (timerId) clearInterval(timerId);
      timerId = null;
      updateView();
    }

    function resetCurrentMode() {
      pause();
      remainingSeconds = getModeSeconds();
      updateView();
    }

    function bindSettings() {
      const handleDurationChange = () => {
        settings.focusMinutes = Number(els.focusMinutes.value);
        settings.shortBreakMinutes = Number(els.shortBreakMinutes.value);
        settings.longBreakMinutes = Number(els.longBreakMinutes.value);
        saveSettings();
        if (!isRunning) {
          remainingSeconds = getModeSeconds();
          updateView();
        }
      };

      els.focusMinutes.addEventListener('change', handleDurationChange);
      els.shortBreakMinutes.addEventListener('change', handleDurationChange);
      els.longBreakMinutes.addEventListener('change', handleDurationChange);

      els.theme.addEventListener('change', () => {
        settings.theme = els.theme.value;
        saveSettings();
        applyTheme();
      });

      els.startSound.addEventListener('change', () => {
        settings.startSound = els.startSound.checked;
        saveSettings();
      });

      els.endSound.addEventListener('change', () => {
        settings.endSound = els.endSound.checked;
        saveSettings();
      });

      els.tickSound.addEventListener('change', () => {
        settings.tickSound = els.tickSound.checked;
        saveSettings();
      });

      els.volume.addEventListener('input', () => {
        settings.volume = Number(els.volume.value);
        els.volumeValue.textContent = String(settings.volume);
        saveSettings();
      });
    }

    els.startPause.addEventListener('click', () => {
      if (isRunning) {
        pause();
      } else {
        start();
      }
    });

    els.reset.addEventListener('click', resetCurrentMode);
    els.skip.addEventListener('click', () => {
      pause();
      nextMode();
    });

    saveSettings();
    applyTheme();
    initControlsFromSettings();
    bindSettings();
    updateView();
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path != "/":
                self.send_response(404)
                self.end_headers()
                return
            body = HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
