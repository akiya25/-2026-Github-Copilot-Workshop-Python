/**
 * セッション永続化（localStorage）
 * 当日分の完了フォーカスセッションを保存し、統計を復元する
 */
import { STORAGE_KEYS, TIMER_MODES } from '../domain/constants.js';

function createEmptyRecord(date) {
  return {
    date,
    completedFocusSessions: []
  };
}

export class SessionRepository {
  constructor(storage = globalThis.localStorage, nowProvider = () => new Date()) {
    this.storage = storage;
    this.nowProvider = nowProvider;
  }

  getTodayDateString() {
    return this.nowProvider().toISOString().slice(0, 10);
  }

  getStoredRecord() {
    if (!this.storage) {
      return createEmptyRecord(this.getTodayDateString());
    }

    try {
      const raw = this.storage.getItem(STORAGE_KEYS.SESSIONS_TODAY);
      if (!raw) {
        return createEmptyRecord(this.getTodayDateString());
      }

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return createEmptyRecord(this.getTodayDateString());
      }

      return {
        date: parsed.date,
        completedFocusSessions: Array.isArray(parsed.completedFocusSessions)
          ? parsed.completedFocusSessions
          : []
      };
    } catch (error) {
      console.warn('[SessionRepository] Failed to read storage:', error);
      return createEmptyRecord(this.getTodayDateString());
    }
  }

  saveRecord(record) {
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(STORAGE_KEYS.SESSIONS_TODAY, JSON.stringify(record));
    } catch (error) {
      console.warn('[SessionRepository] Failed to write storage:', error);
    }
  }

  getTodayRecord() {
    const today = this.getTodayDateString();
    const record = this.getStoredRecord();

    if (record.date !== today) {
      const freshRecord = createEmptyRecord(today);
      this.saveRecord(freshRecord);
      return freshRecord;
    }

    return record;
  }

  getTodayStats() {
    const record = this.getTodayRecord();
    const completedSessions = record.completedFocusSessions.length;

    return {
      completedSessions,
      focusMinutes: completedSessions * (TIMER_MODES.FOCUS.time / 60)
    };
  }

  recordCompletedFocusSession(completedAt = this.nowProvider().toISOString()) {
    const record = this.getTodayRecord();
    const nextRecord = {
      ...record,
      completedFocusSessions: [...record.completedFocusSessions, completedAt]
    };

    this.saveRecord(nextRecord);
    return this.getTodayStats();
  }

  clearTodayStats() {
    const emptyRecord = createEmptyRecord(this.getTodayDateString());
    this.saveRecord(emptyRecord);
    return this.getTodayStats();
  }
}

export const sessionRepository = new SessionRepository();
