/**
 * sessionRepository.js のユニットテスト
 * localStorage ベースの日次統計保存を検証
 */

import { SessionRepository } from '../../static/js/infrastructure/sessionRepository.js';
import { STORAGE_KEYS } from '../../static/js/domain/constants.js';

function createMockStorage(initialValue = null) {
  const store = new Map();

  if (initialValue !== null) {
    store.set(STORAGE_KEYS.SESSIONS_TODAY, initialValue);
  }

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

describe('sessionRepository.js', () => {
  test('保存データがなければ空の当日統計を返す', () => {
    const repository = new SessionRepository(
      createMockStorage(),
      () => new Date('2026-04-17T09:00:00.000Z')
    );

    expect(repository.getTodayStats()).toEqual({
      completedSessions: 0,
      focusMinutes: 0
    });
  });

  test('focus セッション完了を保存すると統計が増える', () => {
    const repository = new SessionRepository(
      createMockStorage(),
      () => new Date('2026-04-17T09:00:00.000Z')
    );

    const stats = repository.recordCompletedFocusSession('2026-04-17T09:30:00.000Z');

    expect(stats).toEqual({
      completedSessions: 1,
      focusMinutes: 25
    });
  });

  test('複数セッション保存時に集中時間が累積する', () => {
    const repository = new SessionRepository(
      createMockStorage(),
      () => new Date('2026-04-17T09:00:00.000Z')
    );

    repository.recordCompletedFocusSession('2026-04-17T09:30:00.000Z');
    const stats = repository.recordCompletedFocusSession('2026-04-17T10:00:00.000Z');

    expect(stats).toEqual({
      completedSessions: 2,
      focusMinutes: 50
    });
  });

  test('同じ日なら保存済みデータを復元する', () => {
    const storage = createMockStorage(JSON.stringify({
      date: '2026-04-17',
      completedFocusSessions: ['2026-04-17T09:30:00.000Z', '2026-04-17T10:00:00.000Z']
    }));
    const repository = new SessionRepository(
      storage,
      () => new Date('2026-04-17T12:00:00.000Z')
    );

    expect(repository.getTodayStats()).toEqual({
      completedSessions: 2,
      focusMinutes: 50
    });
  });

  test('日付が変わった古いデータは当日分にリセットされる', () => {
    const storage = createMockStorage(JSON.stringify({
      date: '2026-04-16',
      completedFocusSessions: ['2026-04-16T09:30:00.000Z']
    }));
    const repository = new SessionRepository(
      storage,
      () => new Date('2026-04-17T08:00:00.000Z')
    );

    expect(repository.getTodayStats()).toEqual({
      completedSessions: 0,
      focusMinutes: 0
    });
  });

  test('ストレージ内容が壊れていても空統計にフォールバックする', () => {
    const repository = new SessionRepository(
      createMockStorage('{broken json'),
      () => new Date('2026-04-17T09:00:00.000Z')
    );

    expect(repository.getTodayStats()).toEqual({
      completedSessions: 0,
      focusMinutes: 0
    });
  });

  test('clearTodayStats で当日統計を初期化できる', () => {
    const repository = new SessionRepository(
      createMockStorage(),
      () => new Date('2026-04-17T09:00:00.000Z')
    );

    repository.recordCompletedFocusSession('2026-04-17T09:30:00.000Z');
    const stats = repository.clearTodayStats();

    expect(stats).toEqual({
      completedSessions: 0,
      focusMinutes: 0
    });
  });
});
