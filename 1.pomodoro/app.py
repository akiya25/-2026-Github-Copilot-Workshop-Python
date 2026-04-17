from __future__ import annotations

from http.server import BaseHTTPRequestHandler, HTTPServer


FOCUS_SECONDS = 25 * 60
BREAK_SECONDS = 5 * 60


def build_html() -> str:
    html = """<!doctype html>
<html lang=\"ja\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>Pomodoro Visual Feedback</title>
  <style>
    :root {{
      --bg: #0f172a;
      --surface: rgba(15, 23, 42, 0.78);
      --text: #e2e8f0;
      --color-calm: #4da3ff;
      --color-steady: #47d7ac;
      --color-mid: #ffd166;
      --color-danger: #ff5d73;
      --ring-color: var(--color-calm);
      --ring-size: min(66vw, 340px);
      --ring-stroke: 14;
    }}

    * {{ box-sizing: border-box; }}
    html, body {{ height: 100%; margin: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;
      color: var(--text);
      background: radial-gradient(1200px 700px at 15% 10%, #1e293b, var(--bg));
      display: grid;
      place-items: center;
      overflow: hidden;
    }}

    .focus-bg {{
      position: fixed;
      inset: 0;
      z-index: -1;
      opacity: 0;
      transition: opacity 260ms ease;
      background-image:
        radial-gradient(circle at 20% 30%, rgba(77, 163, 255, 0.22), transparent 34%),
        radial-gradient(circle at 78% 62%, rgba(71, 215, 172, 0.16), transparent 38%),
        radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05), transparent 55%);
    }}

    body.mode-focus .focus-bg {{ opacity: 1; }}

    .focus-bg::after {{
      content: \"\";
      position: absolute;
      inset: -20%;
      background:
        radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 2px) 0 0/48px 48px;
      animation: drift 16s linear infinite;
      will-change: transform;
    }}

    .panel {{
      width: min(92vw, 460px);
      border: 1px solid rgba(255,255,255,0.12);
      background: var(--surface);
      border-radius: 18px;
      backdrop-filter: blur(8px);
      padding: 20px 18px 24px;
      text-align: center;
      box-shadow: 0 14px 28px rgba(2, 6, 23, 0.38);
    }}

    .mode-switch, .controls {{
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }}

    button {{
      border: 1px solid rgba(255,255,255,0.18);
      background: rgba(255,255,255,0.07);
      color: var(--text);
      padding: 8px 12px;
      border-radius: 999px;
      cursor: pointer;
      transition: transform 120ms ease, background 120ms ease;
    }}

    button:active {{ transform: translateY(1px) scale(0.99); }}
    button.primary {{ background: rgba(77, 163, 255, 0.22); border-color: rgba(77, 163, 255, 0.42); }}

    .ring-wrap {{
      margin: 18px 0 12px;
      position: relative;
      width: var(--ring-size);
      aspect-ratio: 1;
      margin-inline: auto;
    }}

    .ring-wrap svg {{ width: 100%; height: 100%; transform: rotate(-90deg); }}

    .track {{ fill: none; stroke: rgba(255,255,255,0.14); stroke-width: var(--ring-stroke); }}
    .progress {{
      fill: none;
      stroke: var(--ring-color);
      stroke-width: var(--ring-stroke);
      stroke-linecap: round;
      transition: stroke 300ms ease;
      filter: drop-shadow(0 0 8px color-mix(in srgb, var(--ring-color), transparent 52%));
    }}

    .time {{
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      font-size: clamp(2rem, 11vw, 3.2rem);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.04em;
      text-shadow: 0 2px 20px rgba(0,0,0,0.24);
    }}

    .status {{ opacity: 0.88; margin-bottom: 14px; min-height: 1.2em; }}

    .burst {{
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 999px;
      pointer-events: none;
      opacity: 0;
      z-index: 20;
      animation: pop 900ms ease-out forwards;
      will-change: transform, opacity;
    }}

    @keyframes drift {{
      from {{ transform: translate3d(0, 0, 0); }}
      to {{ transform: translate3d(84px, 52px, 0); }}
    }}

    @keyframes pop {{
      0% {{ transform: translate3d(0, 0, 0) scale(0.7); opacity: 0.95; }}
      100% {{ transform: translate3d(var(--x), var(--y), 0) scale(0.2); opacity: 0; }}
    }}

    @media (prefers-reduced-motion: reduce) {{
      *, *::before, *::after {{
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
      }}
      .focus-bg::after {{ animation: none; }}
    }}
  </style>
</head>
<body class=\"mode-focus\">
  <div class=\"focus-bg\" aria-hidden=\"true\"></div>
  <main class=\"panel\">
    <div class=\"mode-switch\" role=\"group\" aria-label=\"mode\">
      <button id=\"focusBtn\" class=\"primary\">Focus (25m)</button>
      <button id=\"breakBtn\">Break (5m)</button>
    </div>

    <div class=\"ring-wrap\">
      <svg viewBox=\"0 0 120 120\" aria-label=\"progress\">
        <circle class=\"track\" cx=\"60\" cy=\"60\" r=\"52\"></circle>
        <circle class=\"progress\" id=\"progressCircle\" cx=\"60\" cy=\"60\" r=\"52\"></circle>
      </svg>
      <div class=\"time\" id=\"timeText\">25:00</div>
    </div>

    <div class=\"status\" id=\"statusText\">集中タイム</div>

    <div class=\"controls\" role=\"group\" aria-label=\"timer controls\">
      <button id=\"startBtn\" class=\"primary\">Start</button>
      <button id=\"pauseBtn\">Pause</button>
      <button id=\"resetBtn\">Reset</button>
    </div>
  </main>

  <script>
    const totalFocus = __FOCUS_SECONDS__;
    const totalBreak = __BREAK_SECONDS__;

    const body = document.body;
    const progressCircle = document.getElementById('progressCircle');
    const timeText = document.getElementById('timeText');
    const statusText = document.getElementById('statusText');
    const focusBtn = document.getElementById('focusBtn');
    const breakBtn = document.getElementById('breakBtn');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const resetBtn = document.getElementById('resetBtn');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    progressCircle.style.strokeDasharray = `${circumference}`;

    let mode = 'focus';
    let total = totalFocus;
    let remainingMs = total * 1000;
    let isRunning = false;
    let startEpoch = 0;
    let baseMs = remainingMs;
    let frameId = 0;

    function easeOutSine(x) {{ return Math.sin((x * Math.PI) / 2); }}

    function formatTime(ms) {{
      const s = Math.max(0, Math.ceil(ms / 1000));
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      return `${mm}:${ss}`;
    }}

    function colorByRatio(ratio) {{
      if (ratio > 0.75) return 'var(--color-calm)';
      if (ratio > 0.5) return 'var(--color-steady)';
      if (ratio > 0.25) return 'var(--color-mid)';
      return 'var(--color-danger)';
    }}

    function setMode(nextMode) {{
      mode = nextMode;
      total = mode === 'focus' ? totalFocus : totalBreak;
      remainingMs = total * 1000;
      baseMs = remainingMs;
      isRunning = false;
      cancelAnimationFrame(frameId);

      body.classList.toggle('mode-focus', mode === 'focus');
      focusBtn.classList.toggle('primary', mode === 'focus');
      breakBtn.classList.toggle('primary', mode === 'break');
      statusText.textContent = mode === 'focus' ? '集中タイム' : '休憩タイム';
      render();
    }}

    function render() {{
      const ratio = Math.max(0, Math.min(1, remainingMs / (total * 1000)));
      const eased = reduceMotion ? ratio : easeOutSine(ratio);
      const offset = circumference * (1 - eased);

      progressCircle.style.strokeDashoffset = `${offset}`;
      const ringColor = colorByRatio(ratio);
      document.documentElement.style.setProperty('--ring-color', ringColor);

      timeText.textContent = formatTime(remainingMs);
      if (remainingMs <= 0) {{
        statusText.textContent = '完了！お疲れさまでした';
      }} else if (mode === 'focus') {{
        statusText.textContent = '集中タイム';
      }} else {{
        statusText.textContent = '休憩タイム';
      }}
    }}

    function burst() {{
      if (reduceMotion) return;
      const colors = ['#4da3ff', '#47d7ac', '#ffd166', '#ff5d73'];
      for (let i = 0; i < 26; i += 1) {{
        const dot = document.createElement('span');
        dot.className = 'burst';
        const angle = (Math.PI * 2 * i) / 26;
        const distance = 80 + Math.random() * 140;
        dot.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
        dot.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
        dot.style.background = colors[i % colors.length];
        dot.style.left = `${window.innerWidth / 2}px`;
        dot.style.top = `${window.innerHeight / 2}px`;
        document.body.appendChild(dot);
        dot.addEventListener('animationend', () => dot.remove(), {{ once: true }});
      }}
    }}

    function tick(now) {{
      if (!isRunning) return;
      const elapsed = now - startEpoch;
      remainingMs = Math.max(0, baseMs - elapsed);
      render();

      if (remainingMs <= 0) {{
        isRunning = false;
        burst();
        return;
      }}
      frameId = requestAnimationFrame(tick);
    }}

    startBtn.addEventListener('click', () => {{
      if (isRunning || remainingMs <= 0) return;
      isRunning = true;
      startEpoch = performance.now();
      baseMs = remainingMs;
      frameId = requestAnimationFrame(tick);
    }});

    pauseBtn.addEventListener('click', () => {{
      if (!isRunning) return;
      isRunning = false;
      cancelAnimationFrame(frameId);
    }});

    resetBtn.addEventListener('click', () => setMode(mode));
    focusBtn.addEventListener('click', () => setMode('focus'));
    breakBtn.addEventListener('click', () => setMode('break'));

    render();
  </script>
</body>
</html>
"""
    return (
        html.replace("{{", "{")
        .replace("}}", "}")
        .replace("__FOCUS_SECONDS__", str(FOCUS_SECONDS))
        .replace("__BREAK_SECONDS__", str(BREAK_SECONDS))
    )


class PomodoroHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        html = build_html().encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(html)))
        self.end_headers()
        self.wfile.write(html)


def run_server(port: int = 8000) -> None:
    server = HTTPServer(("127.0.0.1", port), PomodoroHandler)
    print(f"Pomodoro app: http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
