import { renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mac');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('calls handler for mod+k', async () => {
  const handlers = { 'mod+k': vi.fn() };
  renderHook(() => useKeyboardShortcuts(handlers));
  await userEvent.keyboard('{Meta>}k{/Meta}');
  expect(handlers['mod+k']).toHaveBeenCalled();
});

test('calls handler for mod+1', async () => {
  const handlers = { 'mod+1': vi.fn() };
  renderHook(() => useKeyboardShortcuts(handlers));
  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(handlers['mod+1']).toHaveBeenCalled();
});
