/**
 * timerReducer.js のユニットテスト
 * ステートマシン（状態遷移）のテスト
 */

import { timerReducer, initialState } from '../../static/js/domain/timerReducer.js';
import { TIMER_MODES, TIMER_STATES, TIMER_ACTIONS } from '../../static/js/domain/constants.js';

describe('timerReducer.js', () => {
  // ================================
  // 初期状態のテスト
  // ================================
  describe('initialState', () => {
    test('初期状態は idle', () => {
      expect(initialState.status).toBe(TIMER_STATES.IDLE);
    });

    test('初期モードは focus', () => {
      expect(initialState.mode).toBe('focus');
    });

    test('初期時刻は 25 分', () => {
      expect(initialState.currentTime).toBe(TIMER_MODES.FOCUS.time);
    });

    test('ターゲット時刻は初期化時に null', () => {
      expect(initialState.targetTime).toBe(null);
    });

    test('セッション数は初期化時に 0', () => {
      expect(initialState.totalSessions).toBe(0);
    });
  });

  // ================================
  // START アクションのテスト
  // ================================
  describe('START action', () => {
    test('idle 状態から running へ遷移', () => {
      const state = { ...initialState };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.START });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });

    test('START で targetTime が設定される', () => {
      const now = Date.now() / 1000;
      const state = { ...initialState };
      const newState = timerReducer(state, {
        type: TIMER_ACTIONS.START,
        now
      });

      expect(newState.targetTime).toBe(now + TIMER_MODES.FOCUS.time);
    });

    test('finished 状態から START で running へ遷移', () => {
      const finishedState = {
        ...initialState,
        status: TIMER_STATES.FINISHED,
        totalSessions: 1
      };
      const newState = timerReducer(finishedState, { type: TIMER_ACTIONS.START });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });

    test('running 状態からの START は無効（idle 状態のみ）', () => {
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING
      };
      const newState = timerReducer(runningState, { type: TIMER_ACTIONS.START });

      // ステータスは変わらない
      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });
  });

  // ================================
  // PAUSE アクションのテスト
  // ================================
  describe('PAUSE action', () => {
    test('running 状態から paused へ遷移', () => {
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        currentTime: 1200
      };
      const newState = timerReducer(runningState, { type: TIMER_ACTIONS.PAUSE });

      expect(newState.status).toBe(TIMER_STATES.PAUSED);
    });

    test('PAUSE で currentTime は保持される', () => {
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        currentTime: 1200
      };
      const newState = timerReducer(runningState, { type: TIMER_ACTIONS.PAUSE });

      expect(newState.currentTime).toBe(1200);
    });

    test('idle 状態からの PAUSE は無効', () => {
      const idleState = { ...initialState };
      const newState = timerReducer(idleState, { type: TIMER_ACTIONS.PAUSE });

      expect(newState.status).toBe(TIMER_STATES.IDLE);
    });
  });

  // ================================
  // RESUME アクションのテスト
  // ================================
  describe('RESUME action', () => {
    test('paused 状態から running へ遷移', () => {
      const pausedState = {
        ...initialState,
        status: TIMER_STATES.PAUSED,
        currentTime: 1200
      };
      const newState = timerReducer(pausedState, { type: TIMER_ACTIONS.RESUME });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });

    test('RESUME で新しい targetTime が計算される', () => {
      const now = Date.now() / 1000;
      const pausedState = {
        ...initialState,
        status: TIMER_STATES.PAUSED,
        currentTime: 1200
      };
      const newState = timerReducer(pausedState, {
        type: TIMER_ACTIONS.RESUME,
        now
      });

      expect(newState.targetTime).toBe(now + 1200);
    });

    test('running 状態からの RESUME は無効', () => {
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING
      };
      const newState = timerReducer(runningState, { type: TIMER_ACTIONS.RESUME });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });
  });

  // ================================
  // RESET アクションのテスト
  // ================================
  describe('RESET action', () => {
    test('どの状態からでも idle へリセット', () => {
      const states = [
        TIMER_STATES.RUNNING,
        TIMER_STATES.PAUSED,
        TIMER_STATES.FINISHED
      ];

      states.forEach(status => {
        const state = {
          ...initialState,
          status,
          currentTime: 500
        };
        const newState = timerReducer(state, { type: TIMER_ACTIONS.RESET });

        expect(newState.status).toBe(TIMER_STATES.IDLE);
      });
    });

    test('RESET で currentTime を初期値に戻す', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        currentTime: 500,
        targetTime: Date.now() / 1000 + 500
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.RESET });

      expect(newState.currentTime).toBe(TIMER_MODES.FOCUS.time);
    });

    test('RESET で targetTime を null にする', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        targetTime: Date.now() / 1000
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.RESET });

      expect(newState.targetTime).toBeNull();
    });

    test('RESET でセッション数はもう一度初期化される（初期状態に戻す）', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.FINISHED,
        totalSessions: 5
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.RESET });

      expect(newState.totalSessions).toBe(0);
    });
  });

  // ================================
  // TICK アクションのテスト
  // ================================
  describe('TICK action', () => {
    test('running 状態でのみ TICK を処理', () => {
      const now = Date.now() / 1000;
      const targetTime = now + 1500;
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        targetTime
      };

      const newState = timerReducer(runningState, {
        type: TIMER_ACTIONS.TICK,
        now
      });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
    });

    test('TICK で残り時間を計算', () => {
      const now = Date.now() / 1000;
      const targetTime = now + 1500; // 25分後
      const runningState = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        targetTime
      };

      const newState = timerReducer(runningState, {
        type: TIMER_ACTIONS.TICK,
        now
      });

      // 残り時間は約 1500 秒
      expect(newState.currentTime).toBeGreaterThanOrEqual(1498);
      expect(newState.currentTime).toBeLessThanOrEqual(1500);
    });

    test('idle 状態での TICK は何もしない', () => {
      const state = { ...initialState };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.TICK });

      expect(newState.status).toBe(TIMER_STATES.IDLE);
    });

    test('paused 状態での TICK は何もしない', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.PAUSED
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.TICK });

      expect(newState.status).toBe(TIMER_STATES.PAUSED);
    });
  });

  // ================================
  // COMPLETE アクションのテスト
  // ================================
  describe('COMPLETE action', () => {
    test('running 状態から finished へ遷移', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.status).toBe(TIMER_STATES.FINISHED);
    });

    test('focus モードで COMPLETE するとセッション数が増加', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'focus',
        totalSessions: 2
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.totalSessions).toBe(3);
    });

    test('short_break モードで COMPLETE してもセッション数は増加しない', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'short_break',
        totalSessions: 2
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.totalSessions).toBe(2);
    });

    test('long_break モードで COMPLETE してもセッション数は増加しない', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'long_break',
        totalSessions: 2
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.totalSessions).toBe(2);
    });

    test('COMPLETE で自動的に次モードに切り替わる', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'focus'
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.mode).toBe('short_break');
    });

    test('short_break から focus へ切り替わる', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'short_break'
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.mode).toBe('focus');
    });

    test('COMPLETE で新しいモードのタイマー時間が設定される', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'focus',
        currentTime: 0
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      // short_break は 5分 (300秒)
      expect(newState.currentTime).toBe(TIMER_MODES.SHORT_BREAK.time);
    });

    test('COMPLETE で currentTime は新モードの時間に', () => {
      const state = {
        ...initialState,
        status: TIMER_STATES.RUNNING,
        mode: 'focus'
      };
      const newState = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });

      expect(newState.currentTime).toBe(300); // short_break = 5分
    });
  });

  // ================================
  // 状態遷移フロー（統合テスト）
  // ================================
  describe('状態遷移フロー', () => {
    test('タイマーの完全フロー: idle → running → paused → running → finished → idle', () => {
      const now = Date.now() / 1000;
      let state = { ...initialState };

      // 1. START
      state = timerReducer(state, { type: TIMER_ACTIONS.START, now });
      expect(state.status).toBe(TIMER_STATES.RUNNING);

      // 2. PAUSE
      state = timerReducer(state, { type: TIMER_ACTIONS.PAUSE });
      expect(state.status).toBe(TIMER_STATES.PAUSED);

      // 3. RESUME
      state = timerReducer(state, { type: TIMER_ACTIONS.RESUME, now });
      expect(state.status).toBe(TIMER_STATES.RUNNING);

      // 4. COMPLETE
      state = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });
      expect(state.status).toBe(TIMER_STATES.FINISHED);
      expect(state.mode).toBe('short_break');
      expect(state.totalSessions).toBe(1);

      // 5. RESET
      state = timerReducer(state, { type: TIMER_ACTIONS.RESET });
      expect(state.status).toBe(TIMER_STATES.IDLE);
    });

    test('複数セッション完了フロー', () => {
      const now = Date.now() / 1000;
      let state = { ...initialState };

      // セッション 1: focus完了 → short_breakへ（totalSessions = 1）
      state = timerReducer(state, { type: TIMER_ACTIONS.START, now });
      state = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });
      expect(state.totalSessions).toBe(1);
      expect(state.mode).toBe('short_break');

      // セッション 2: short_break完了 → focusへ（totalSessions変わらず）
      state = timerReducer(state, { type: TIMER_ACTIONS.START, now });
      state = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });
      expect(state.totalSessions).toBe(1); // short_breakのみなのでカウントされない
      expect(state.mode).toBe('focus');

      // セッション 3: focus完了 → short_breakへ（totalSessions = 2）
      state = timerReducer(state, { type: TIMER_ACTIONS.START, now });
      state = timerReducer(state, { type: TIMER_ACTIONS.COMPLETE });
      expect(state.totalSessions).toBe(2);
    });

    test('一時停止・再開をシミュレート', () => {
      const now = Date.now() / 1000;
      let state = { ...initialState };

      // START
      state = timerReducer(state, { type: TIMER_ACTIONS.START, now });
      const targetTime1 = state.targetTime;

      // TICK: 10秒経過
      state = timerReducer(state, { type: TIMER_ACTIONS.TICK, now: now + 10 });
      const timeAfter10s = state.currentTime;

      // PAUSE
      state = timerReducer(state, { type: TIMER_ACTIONS.PAUSE });
      expect(state.currentTime).toBe(timeAfter10s);

      // 100秒実時間が経過したとしても TICK は無視
      state = timerReducer(state, { type: TIMER_ACTIONS.TICK, now: now + 100 });
      expect(state.currentTime).toBe(timeAfter10s);

      // RESUME
      state = timerReducer(state, { type: TIMER_ACTIONS.RESUME, now: now + 100 });
      const targetTime2 = state.targetTime;

      // ターゲット時刻は再計算される
      expect(targetTime2).not.toBe(targetTime1);
    });
  });

  // ================================
  // エッジケースのテスト
  // ================================
  describe('エッジケース', () => {
    test('アクション type が undefined の場合、状態は変わらない', () => {
      const state = { ...initialState };
      const newState = timerReducer(state, {});

      expect(newState).toEqual(state);
    });

    test('アクション type が不正な場合、状態は変わらない', () => {
      const state = { ...initialState };
      const newState = timerReducer(state, { type: 'INVALID_ACTION' });

      expect(newState).toEqual(state);
    });

    test('now が負の値の場合も処理される', () => {
      const state = { ...initialState };
      const newState = timerReducer(state, {
        type: TIMER_ACTIONS.START,
        now: -100
      });

      expect(newState.status).toBe(TIMER_STATES.RUNNING);
      expect(newState.targetTime).toBe(-100 + TIMER_MODES.FOCUS.time);
    });
  });
});
