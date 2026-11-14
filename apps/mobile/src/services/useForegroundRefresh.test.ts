import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppState } from 'react-native';

import { useForegroundRefresh } from './useForegroundRefresh';

const boundary = vi.hoisted(() => ({
  focus: null as (() => (() => void)) | null,
  listeners: new Map<string, (state: string) => void>(),
  savedListeners: new Set<() => void>(),
  cleanups: [] as (() => void)[],
}));
vi.mock('react', () => ({
  useCallback: (callback: unknown) => callback,
  useRef: <T,>(initial: T) => ({ current: initial }),
  useEffect: (effect: () => () => void) => {
    boundary.cleanups.push(effect());
  },
}));
vi.mock('expo-router', () => ({
  useFocusEffect: (effect: () => () => void) => {
    boundary.focus = effect;
  },
}));
vi.mock('@shengzhang/screen-capture', () => ({
  addScreenBillSavedListener: (listener: () => void) => {
    boundary.savedListeners.add(listener);
    return {
      remove: () => {
        boundary.savedListeners.delete(listener);
      },
    };
  },
}));
vi.mock('react-native', () => {
  const appState = {
    currentState: 'active',
    addEventListener(event: string, listener: (state: string) => void) {
      const tracked =
        event === 'change'
          ? (state: string) => {
              (appState as { currentState: string }).currentState = state;
              listener(state);
            }
          : listener;
      boundary.listeners.set(event, tracked);
      return {
        remove: () => {
          boundary.listeners.delete(event);
        },
      };
    },
  };
  return { AppState: appState };
});

beforeEach(() => {
  vi.useFakeTimers();
  boundary.focus = null;
  boundary.listeners.clear();
  boundary.savedListeners.clear();
  boundary.cleanups = [];
  (AppState as unknown as { currentState: string }).currentState = 'active';
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('foreground ledger refresh', () => {
  it('reads a transaction saved outside the app when the app becomes active again', () => {
    let ledgerCount = 0;
    let displayedCount = -1;
    const refresh = vi.fn(() => {
      displayedCount = ledgerCount;
    });
    useForegroundRefresh(refresh);
    boundary.focus!();
    expect(displayedCount).toBe(0);
    boundary.listeners.get('change')!('background');
    ledgerCount = 1;
    expect(displayedCount).toBe(0);
    boundary.listeners.get('change')!('active');
    expect(displayedCount).toBe(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it('refreshes on Android focus when no active change event follows', () => {
    let ledgerCount = 0;
    let displayedCount = -1;
    const refresh = vi.fn(() => {
      displayedCount = ledgerCount;
    });
    useForegroundRefresh(refresh);
    boundary.focus!();
    ledgerCount = 1;
    boundary.listeners.get('focus')!('active');
    expect(displayedCount).toBe(1);
  });

  it('refreshes as soon as the native overlay reports a saved bill', () => {
    let ledgerCount = 0;
    let displayedCount = -1;
    const refresh = vi.fn(() => {
      displayedCount = ledgerCount;
    });
    useForegroundRefresh(refresh);
    boundary.focus!();
    ledgerCount = 1;
    for (const listener of boundary.savedListeners) listener();
    expect(displayedCount).toBe(1);
  });

  it('reads again shortly after a native save so a late commit still shows up', () => {
    let ledgerCount = 0;
    let displayedCount = -1;
    const refresh = vi.fn(() => {
      displayedCount = ledgerCount;
    });
    useForegroundRefresh(refresh);
    boundary.focus!();
    for (const listener of boundary.savedListeners) listener();
    ledgerCount = 2;
    expect(displayedCount).toBe(0);
    vi.advanceTimersByTime(400);
    expect(displayedCount).toBe(2);
  });

  it('keeps refreshing the mounted screen even after it loses focus', () => {
    const refresh = vi.fn();
    useForegroundRefresh(refresh);
    boundary.focus!();
    boundary.listeners.get('change')?.('active');
    for (const listener of boundary.savedListeners) listener();
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it('removes every listener when the screen unmounts', () => {
    const refresh = vi.fn();
    useForegroundRefresh(refresh);
    for (const cleanup of boundary.cleanups) cleanup();
    expect(boundary.listeners.size).toBe(0);
    expect(boundary.savedListeners.size).toBe(0);
    boundary.listeners.get('change')?.('active');
    for (const listener of boundary.savedListeners) listener();
    expect(refresh).not.toHaveBeenCalled();
  });
});
