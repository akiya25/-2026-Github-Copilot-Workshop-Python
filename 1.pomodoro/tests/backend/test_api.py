import unittest
import json

import pytest

from app import app, sessions_db


class TimerApiTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        sessions_db.clear()

    def tearDown(self):
        sessions_db.clear()

    def test_get_stats_today_returns_empty_stats_initially(self):
        response = self.client.get('/api/stats/today')

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload['completedSessions'], 0)
        self.assertEqual(payload['focusMinutes'], 0)
        self.assertIn('lastUpdatedAt', payload)

    def test_create_focus_session_updates_today_stats(self):
        create_response = self.client.post('/api/sessions', json={
            'mode': 'focus',
            'duration': 1500,
            'completed': True,
            'completedAt': '2026-04-17T09:00:00Z'
        })

        self.assertEqual(create_response.status_code, 201)
        created = create_response.get_json()
        self.assertEqual(created['mode'], 'focus')
        self.assertEqual(created['duration'], 1500)

        stats_response = self.client.get('/api/stats/today')
        stats = stats_response.get_json()
        self.assertEqual(stats['completedSessions'], 1)
        self.assertEqual(stats['focusMinutes'], 25)

    def test_break_session_does_not_increment_focus_stats(self):
        self.client.post('/api/sessions', json={
            'mode': 'short_break',
            'duration': 300,
            'completed': True
        })

        stats_response = self.client.get('/api/stats/today')
        stats = stats_response.get_json()
        self.assertEqual(stats['completedSessions'], 0)
        self.assertEqual(stats['focusMinutes'], 0)

    def test_create_session_rejects_invalid_mode(self):
        response = self.client.post('/api/sessions', json={
            'mode': 'invalid_mode',
            'duration': 1500
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['error'], 'Invalid mode')

    def test_create_session_rejects_invalid_duration(self):
        response = self.client.post('/api/sessions', json={
            'mode': 'focus',
            'duration': 30
        })

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()['error'], 'Invalid duration')

    def test_reset_today_clears_saved_sessions(self):
        self.client.post('/api/sessions', json={
            'mode': 'focus',
            'duration': 1500,
            'completed': True
        })

        reset_response = self.client.post('/api/reset-today')
        self.assertEqual(reset_response.status_code, 200)
        self.assertEqual(reset_response.get_json()['status'], 'reset')

        stats_response = self.client.get('/api/stats/today')
        stats = stats_response.get_json()
        self.assertEqual(stats['completedSessions'], 0)
        self.assertEqual(stats['focusMinutes'], 0)

    def test_create_session_missing_mode_returns_400(self):
        response = self.client.post('/api/sessions', json={
            'duration': 1500
        })
        self.assertEqual(response.status_code, 400)

    def test_create_session_missing_duration_returns_400(self):
        response = self.client.post('/api/sessions', json={
            'mode': 'focus'
        })
        self.assertEqual(response.status_code, 400)

    def test_create_session_non_json_body_returns_400(self):
        response = self.client.post(
            '/api/sessions',
            data='not json',
            content_type='text/plain'
        )
        self.assertEqual(response.status_code, 400)

    def test_multiple_focus_sessions_accumulate_correctly(self):
        for _ in range(3):
            self.client.post('/api/sessions', json={
                'mode': 'focus',
                'duration': 1500,
                'completed': True
            })

        stats = self.client.get('/api/stats/today').get_json()
        self.assertEqual(stats['completedSessions'], 3)
        self.assertEqual(stats['focusMinutes'], 75)

    def test_create_long_break_session_no_focus_count(self):
        self.client.post('/api/sessions', json={
            'mode': 'long_break',
            'duration': 900,
            'completed': True
        })

        stats = self.client.get('/api/stats/today').get_json()
        self.assertEqual(stats['completedSessions'], 0)
        self.assertEqual(stats['focusMinutes'], 0)

    def test_stats_last_updated_at_after_session(self):
        self.client.post('/api/sessions', json={
            'mode': 'focus',
            'duration': 1500,
            'completedAt': '2026-04-17T10:00:00Z'
        })

        stats = self.client.get('/api/stats/today').get_json()
        self.assertEqual(stats['lastUpdatedAt'], '2026-04-17T10:00:00Z')


# pytest スタイル fixtures
@pytest.fixture
def client():
    app.config['TESTING'] = True
    sessions_db.clear()
    with app.test_client() as c:
        yield c
    sessions_db.clear()


def test_get_stats_today_pytest(client):
    res = client.get('/api/stats/today')
    assert res.status_code == 200
    data = res.get_json()
    assert 'completedSessions' in data
    assert 'focusMinutes' in data


def test_create_session_pytest(client):
    res = client.post('/api/sessions', json={'mode': 'focus', 'duration': 1500})
    assert res.status_code == 201


def test_invalid_mode_pytest(client):
    res = client.post('/api/sessions', json={'mode': 'invalid', 'duration': 1500})
    assert res.status_code == 400


def test_reset_today_pytest(client):
    client.post('/api/sessions', json={'mode': 'focus', 'duration': 1500, 'completed': True})
    res = client.post('/api/reset-today')
    assert res.status_code == 200
    stats = client.get('/api/stats/today').get_json()
    assert stats['completedSessions'] == 0


if __name__ == '__main__':
    unittest.main()
