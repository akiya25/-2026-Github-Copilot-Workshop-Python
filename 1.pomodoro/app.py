from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any

XP_PER_FOCUS = 25
XP_PER_LEVEL = 100
FOCUS_MINUTES = 25
STATE_FILE = Path(__file__).with_name("pomodoro_state.json")


def calculate_level(total_xp: int, xp_per_level: int = XP_PER_LEVEL) -> dict[str, int]:
    if total_xp < 0:
        total_xp = 0
    level = (total_xp // xp_per_level) + 1
    progress = total_xp % xp_per_level
    return {
        "level": level,
        "progress_xp": progress,
        "xp_for_next_level": xp_per_level,
    }


def _parse_iso_date(value: str | None) -> date | None:
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def calculate_streak(
    last_completion: str | None,
    stored_streak: int,
    max_streak: int,
    today: date | None = None,
) -> dict[str, int]:
    today = today or date.today()
    last_day = _parse_iso_date(last_completion)

    current_streak = max(0, stored_streak)
    if last_day is None:
        return {"streak": 0, "max_streak": max(0, max_streak)}

    gap = (today - last_day).days
    if gap > 1:
        current_streak = 0

    return {
        "streak": current_streak,
        "max_streak": max(max(0, max_streak), current_streak),
    }


def update_streak_on_completion(
    last_completion: str | None,
    current_streak: int,
    max_streak: int,
    completed_on: date | None = None,
) -> dict[str, Any]:
    completed_on = completed_on or date.today()
    last_day = _parse_iso_date(last_completion)

    if last_day is None:
        streak = 1
    else:
        gap = (completed_on - last_day).days
        if gap <= 0:
            streak = max(1, current_streak)
        elif gap == 1:
            streak = current_streak + 1
        else:
            streak = 1

    return {
        "streak": streak,
        "max_streak": max(max_streak, streak),
        "last_completion": completed_on.isoformat(),
    }


def _safe_int(value: Any) -> int:
    try:
        parsed = int(value)
        return max(0, parsed)
    except (ValueError, TypeError):
        return 0


def _load_server_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {"updatedAt": ""}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"updatedAt": ""}


def _save_server_state(payload: dict[str, Any]) -> None:
    payload = dict(payload)
    payload["updatedAt"] = datetime.utcnow().isoformat() + "Z"
    STATE_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


HTML_TEMPLATE = """<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pomodoro Gamification</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; background:#0f172a; color:#e2e8f0; }
    main { max-width: 980px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
    .card { background:#1e293b; border-radius: 12px; padding: 14px; box-shadow: 0 3px 12px rgba(0,0,0,.25); }
    .headline { font-size: 1.2rem; margin: 0 0 8px; }
    .row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    button { border: none; border-radius: 8px; padding: 10px 12px; cursor: pointer; background:#22c55e; color:#08140f; font-weight: 700; }
    button.secondary { background:#64748b; color:#fff; }
    .progress { width: 100%; height: 14px; background:#334155; border-radius: 999px; overflow: hidden; }
    .progress > span { display: block; height: 100%; background: linear-gradient(90deg,#22c55e,#06b6d4); width: 0; }
    .stats-grid { display:grid; gap:8px; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); }
    .metric { background:#334155; padding:10px; border-radius:8px; }
    .streak { font-size: 1.8rem; font-weight: 800; color:#f59e0b; }
    .badge-grid { display:grid; gap:8px; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); }
    .badge { border-radius:8px; padding:10px; background:#334155; border:1px solid #475569; opacity:.6; }
    .badge.unlocked { opacity:1; border-color:#22c55e; background:#14532d; }
    #toasts { position: fixed; right: 12px; bottom: 12px; display: grid; gap: 8px; max-width: 300px; }
    .toast { background:#16a34a; color:#052e16; border-radius:8px; padding:10px; font-weight:700; }
    .chart { display:grid; grid-template-columns: repeat(24, 1fr); gap: 3px; align-items:end; min-height:100px; }
    .bar { background:#06b6d4; border-radius:4px 4px 0 0; min-height:4px; }
    @media (max-width: 640px) { .headline { font-size: 1rem; } }
  </style>
</head>
<body>
  <main>
    <section class="card">
      <h1 class="headline">Pomodoro ゲーミフィケーション</h1>
      <div class="row">
        <button id="complete-btn">集中セッション完了 (+__XP_PER_FOCUS__ XP)</button>
        <button id="attempt-btn" class="secondary">セッション試行のみ (+0 XP)</button>
      </div>
    </section>

    <section class="card">
      <h2 class="headline">プロフィール</h2>
      <div id="level-text"></div>
      <div class="progress"><span id="level-progress"></span></div>
      <p id="xp-text"></p>
    </section>

    <section class="card">
      <h2 class="headline">ストリーク</h2>
      <div class="streak"><span id="streak-days">0</span> 日連続</div>
      <div>最大ストリーク: <strong id="max-streak-days">0</strong> 日</div>
    </section>

    <section class="card">
      <h2 class="headline">週間 / 月間統計</h2>
      <div class="stats-grid" id="stats-grid"></div>
      <h3 class="headline">ピーク時間帯（過去30日）</h3>
      <div class="chart" id="hourly-chart"></div>
    </section>

    <section class="card">
      <h2 class="headline">バッジコレクション</h2>
      <div class="badge-grid" id="badge-grid"></div>
    </section>
  </main>
  <div id="toasts"></div>

  <script>
    const STORAGE_KEY = 'pomodoro_gamification_v1';
    const XP_PER_FOCUS = __XP_PER_FOCUS__;
    const XP_PER_LEVEL = __XP_PER_LEVEL__;
    const FOCUS_MINUTES = __FOCUS_MINUTES__;

    const BADGES = [
      { id: 'streak_3', title: '3日連続完了', description: '3日連続で集中セッションを完了' },
      { id: 'week_10', title: '今週10回完了', description: '過去7日で10回の完了を達成' }
    ];

    function todayKey(d = new Date()) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function parseDate(key) {
      const [y,m,d] = (key || '').split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    }

    function diffDays(a, b) {
      const ms = 24 * 60 * 60 * 1000;
      return Math.floor((new Date(a.getFullYear(),a.getMonth(),a.getDate()) - new Date(b.getFullYear(),b.getMonth(),b.getDate())) / ms);
    }

    function defaultState() {
      return {
        totalXP: 0,
        completed: 0,
        attempted: 0,
        totalFocusMinutes: 0,
        history: [],
        streak: 0,
        maxStreak: 0,
        lastCompletionDate: null,
        badges: [],
        updatedAt: ''
      };
    }

    function mergeState(source) {
      return { ...defaultState(), ...(source || {}) };
    }

    async function loadState() {
      const local = mergeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const remote = mergeState(await res.json());
          if ((remote.updatedAt || '') > (local.updatedAt || '')) return remote;
        }
      } catch (_) {}
      return local;
    }

    function saveState(state) {
      state.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      }).catch(() => {});
    }

    function refreshStreakForToday(state) {
      if (!state.lastCompletionDate) {
        state.streak = 0;
        return;
      }
      const last = parseDate(state.lastCompletionDate);
      const today = new Date();
      if (!last) {
        state.streak = 0;
        return;
      }
      const gap = diffDays(today, last);
      if (gap > 1) state.streak = 0;
    }

    function updateStreakOnComplete(state) {
      const today = todayKey();
      if (!state.lastCompletionDate) {
        state.streak = 1;
      } else {
        const last = parseDate(state.lastCompletionDate);
        const gap = last ? diffDays(parseDate(today), last) : 999;
        if (gap <= 0) {
          state.streak = Math.max(1, state.streak);
        } else if (gap === 1) {
          state.streak += 1;
        } else {
          state.streak = 1;
        }
      }
      state.maxStreak = Math.max(state.maxStreak, state.streak);
      state.lastCompletionDate = today;
    }

    function getLevel(totalXP) {
      const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
      return { level, progressXP: totalXP % XP_PER_LEVEL, next: XP_PER_LEVEL };
    }

    function statsForDays(state, days) {
      const now = new Date();
      const cutoff = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      const items = state.history.filter(h => new Date(h.ts) >= cutoff);
      const attempted = items.length;
      const completedItems = items.filter(h => h.completed);
      const completed = completedItems.length;
      const focusMinutes = completedItems.reduce((acc, h) => acc + (h.focusMinutes || 0), 0);
      const completionRate = attempted ? (completed / attempted) * 100 : 0;
      const avgFocus = completed ? (focusMinutes / completed) : 0;
      const avgSessionsPerDay = completed / days;

      const hourCounts = Array.from({ length: 24 }, () => 0);
      for (const item of completedItems) {
        hourCounts[new Date(item.ts).getHours()] += 1;
      }
      let peakHour = 0;
      for (let i = 1; i < 24; i += 1) {
        if (hourCounts[i] > hourCounts[peakHour]) peakHour = i;
      }

      return { completionRate, avgFocus, avgSessionsPerDay, peakHour, hourCounts };
    }

    function detectNewBadges(state) {
      const unlocked = new Set(state.badges || []);
      const newOnes = [];
      if (state.streak >= 3 && !unlocked.has('streak_3')) newOnes.push('streak_3');
      const completedSessionsThisWeek = statsForDays(state, 7).hourCounts.reduce((a, b) => a + b, 0);
      if (completedSessionsThisWeek >= 10 && !unlocked.has('week_10')) newOnes.push('week_10');

      if (newOnes.length) {
        state.badges = [...unlocked, ...newOnes];
      }
      return newOnes;
    }

    function showToasts(ids) {
      const toasts = document.getElementById('toasts');
      for (const id of ids) {
        const badge = BADGES.find(b => b.id === id);
        const div = document.createElement('div');
        div.className = 'toast';
        div.textContent = `バッジ獲得: ${badge ? badge.title : id}`;
        toasts.appendChild(div);
        setTimeout(() => div.remove(), 3000);
      }
    }

    function render(state) {
      const level = getLevel(state.totalXP);
      document.getElementById('level-text').textContent = `Lv.${level.level}`;
      document.getElementById('xp-text').textContent = `総XP: ${state.totalXP} / 次Lvまで ${level.next - level.progressXP} XP`;
      document.getElementById('level-progress').style.width = `${(level.progressXP / level.next) * 100}%`;

      document.getElementById('streak-days').textContent = String(state.streak);
      document.getElementById('max-streak-days').textContent = String(state.maxStreak);

      const weekly = statsForDays(state, 7);
      const monthly = statsForDays(state, 30);
      const metrics = [
        `週間 完了率: ${weekly.completionRate.toFixed(1)}%`,
        `週間 平均集中時間: ${weekly.avgFocus.toFixed(1)} 分`,
        `週間 1日あたり平均セッション: ${weekly.avgSessionsPerDay.toFixed(2)}`,
        `週間 ピーク時間帯: ${String(weekly.peakHour).padStart(2, '0')}:00`,
        `月間 完了率: ${monthly.completionRate.toFixed(1)}%`,
        `月間 平均集中時間: ${monthly.avgFocus.toFixed(1)} 分`,
        `月間 1日あたり平均セッション: ${monthly.avgSessionsPerDay.toFixed(2)}`,
        `月間 ピーク時間帯: ${String(monthly.peakHour).padStart(2, '0')}:00`
      ];
      const statsGrid = document.getElementById('stats-grid');
      statsGrid.innerHTML = '';
      metrics.forEach(text => {
        const div = document.createElement('div');
        div.className = 'metric';
        div.textContent = text;
        statsGrid.appendChild(div);
      });

      const maxHourCount = Math.max(1, ...monthly.hourCounts);
      const chart = document.getElementById('hourly-chart');
      chart.innerHTML = '';
      monthly.hourCounts.forEach((count, hour) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = `${Math.max(4, (count / maxHourCount) * 100)}px`;
        bar.title = `${String(hour).padStart(2, '0')}:00 (${count})`;
        chart.appendChild(bar);
      });

      const badgeGrid = document.getElementById('badge-grid');
      badgeGrid.innerHTML = '';
      BADGES.forEach(b => {
        const unlocked = (state.badges || []).includes(b.id);
        const div = document.createElement('div');
        div.className = `badge ${unlocked ? 'unlocked' : ''}`;
        div.innerHTML = `<strong>${b.title}</strong><div>${b.description}</div><small>${unlocked ? '獲得済み' : '未獲得'}</small>`;
        badgeGrid.appendChild(div);
      });
    }

    function registerAttempt(state, completed) {
      refreshStreakForToday(state);
      state.attempted += 1;
      const item = { ts: new Date().toISOString(), completed, focusMinutes: completed ? FOCUS_MINUTES : 0 };
      state.history.push(item);
      if (completed) {
        state.completed += 1;
        state.totalFocusMinutes += FOCUS_MINUTES;
        state.totalXP += XP_PER_FOCUS;
        updateStreakOnComplete(state);
      }
      const newBadges = detectNewBadges(state);
      saveState(state);
      render(state);
      showToasts(newBadges);
    }

    (async function init() {
      const state = await loadState();
      refreshStreakForToday(state);
      render(state);
      document.getElementById('complete-btn').addEventListener('click', () => registerAttempt(state, true));
      document.getElementById('attempt-btn').addEventListener('click', () => registerAttempt(state, false));
    })();
  </script>
</body>
</html>
"""

HTML = (
    HTML_TEMPLATE.replace("__XP_PER_FOCUS__", str(XP_PER_FOCUS))
    .replace("__XP_PER_LEVEL__", str(XP_PER_LEVEL))
    .replace("__FOCUS_MINUTES__", str(FOCUS_MINUTES))
)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        if self.path == "/":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML.encode("utf-8"))
            return

        if self.path == "/api/state":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps(_load_server_state(), ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_POST(self) -> None:
        if self.path != "/api/state":
            self.send_response(404)
            self.end_headers()
            return

        content_length = _safe_int(self.headers.get("Content-Length"))
        raw = self.rfile.read(content_length)
        try:
            payload = json.loads(raw.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("payload must be object")
            _save_server_state(payload)
        except (json.JSONDecodeError, UnicodeDecodeError, OSError, ValueError):
            self.send_response(400)
            self.end_headers()
            return

        self.send_response(204)
        self.end_headers()


def run_server(port: int = 8000) -> None:
    server = HTTPServer(("127.0.0.1", port), Handler)
    print(f"Pomodoro app running: http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run_server()
