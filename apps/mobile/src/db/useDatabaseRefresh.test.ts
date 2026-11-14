import { describe, expect, it, vi } from 'vitest';

import { useDatabaseRefresh } from './useDatabaseRefresh';

const boundary = vi.hoisted(() => ({ refresh: null as (() => void) | null }));

vi.mock('../services/useForegroundRefresh', () => ({
  useForegroundRefresh: (refresh: () => void) => {
    boundary.refresh = refresh;
  },
}));

describe('database refresh', () => {
  it('reloads the ledger through the foreground refresh signal', () => {
    const refresh = vi.fn();
    useDatabaseRefresh(refresh);
    boundary.refresh!();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
