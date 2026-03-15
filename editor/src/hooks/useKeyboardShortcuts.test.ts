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

test('calls handler for bare delete key', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ delete: handler }));

  const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body, configurable: true });
  window.dispatchEvent(event);

  expect(handler).toHaveBeenCalled();
});

test('calls handler for bare backspace key', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ backspace: handler }));

  const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body, configurable: true });
  window.dispatchEvent(event);

  expect(handler).toHaveBeenCalled();
});

test('does not call delete handler when focus is in an input', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ delete: handler }));

  const input = document.createElement('input');
  document.body.appendChild(input);

  const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
  Object.defineProperty(event, 'target', { value: input, configurable: true });
  window.dispatchEvent(event);

  expect(handler).not.toHaveBeenCalled();
  document.body.removeChild(input);
});

test('calls handler for escape key', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ escape: handler }));

  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body, configurable: true });
  window.dispatchEvent(event);

  expect(handler).toHaveBeenCalled();
});

test('calls handler for mod+d', async () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ 'mod+d': handler }));
  await userEvent.keyboard('{Meta>}d{/Meta}');
  expect(handler).toHaveBeenCalled();
});

test('calls mod+d handler from inside an input (whitelisted)', () => {
  const handler = vi.fn();
  renderHook(() => useKeyboardShortcuts({ 'mod+d': handler }));

  const input = document.createElement('input');
  document.body.appendChild(input);

  const event = new KeyboardEvent('keydown', {
    key: 'd',
    metaKey: true,
    bubbles: true,
  });
  Object.defineProperty(event, 'target', { value: input, configurable: true });
  window.dispatchEvent(event);

  expect(handler).toHaveBeenCalled();
  document.body.removeChild(input);
});
