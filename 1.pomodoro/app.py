"""
ポモドーロタイマー Flask アプリケーション
Phase 5: バックエンド API 連携
"""
from datetime import date, datetime
from flask import Flask, jsonify, render_template, request

# Flask アプリケーション初期化
app = Flask(__name__)

# テンプレートディレクトリ設定
app.config['TEMPLATES_AUTO_RELOAD'] = True

# メモリ内 DB（Phase 5: 将来は SQLite などに置換可能）
sessions_db = {}
VALID_MODES = {'focus', 'short_break', 'long_break'}


def get_today_key():
    """当日キーを返す"""
    return date.today().isoformat()


def get_today_sessions():
    """当日セッション一覧を返す"""
    return sessions_db.setdefault(get_today_key(), [])


def build_today_stats():
    """当日統計を返す"""
    sessions = get_today_sessions()
    completed_sessions = [
        session for session in sessions
        if session['mode'] == 'focus' and session.get('completed')
    ]
    focus_minutes = sum(session['duration'] for session in completed_sessions) // 60

    last_updated_at = sessions[-1]['completedAt'] if sessions else datetime.utcnow().isoformat() + 'Z'
    return {
        'completedSessions': len(completed_sessions),
        'focusMinutes': focus_minutes,
        'lastUpdatedAt': last_updated_at
    }


# ルーティング
@app.route('/')
def index():
    """タイマーUI画面を配信"""
    return render_template('index.html')


@app.route('/api/stats/today', methods=['GET'])
def get_stats_today():
    """当日統計を取得"""
    return jsonify(build_today_stats())


@app.route('/api/sessions', methods=['POST'])
def create_session():
    """セッションを保存"""
    data = request.get_json(silent=True) or {}
    mode = data.get('mode')
    duration = data.get('duration')

    if mode not in VALID_MODES:
        return jsonify({'error': 'Invalid mode'}), 400

    if not isinstance(duration, int) or not (60 <= duration <= 3600):
        return jsonify({'error': 'Invalid duration'}), 400

    today_sessions = get_today_sessions()
    session = {
        'id': len(today_sessions) + 1,
        'mode': mode,
        'duration': duration,
        'completed': bool(data.get('completed', True)),
        'completedAt': data.get('completedAt') or datetime.utcnow().isoformat() + 'Z'
    }
    today_sessions.append(session)

    return jsonify(session), 201


@app.route('/api/reset-today', methods=['POST'])
def reset_today():
    """当日セッションをリセット"""
    sessions_db[get_today_key()] = []
    return jsonify({'status': 'reset', 'stats': build_today_stats()}), 200


if __name__ == '__main__':
    # 開発サーバー起動
    app.run(debug=False, port=5000, host='0.0.0.0')
