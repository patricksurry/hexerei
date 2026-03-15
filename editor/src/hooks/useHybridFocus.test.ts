import { renderHook } from '@testing-library/react';
import { vi, test, expect, afterEach } from 'vitest';
import { useHybridFocus } from './useHybridFocus';

afterEach(() => {
  vi.clearAllMocks();
});

test('calls onCapture when printable key is pressed without modifier', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  // Simulate pressing '0' with no modifier, target is document.body
  const event = new KeyboardEvent('keydown', { key: '0', bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body, configurable: true });
  window.dispatchEvent(event);

  expect(onCapture).toHaveBeenCalledWith('0');
});

test('does not capture when modifier key is held', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
  Object.defineProperty(event, 'target', { value: document.body, configurable: true });
  window.dispatchEvent(event);

  expect(onCapture).not.toHaveBeenCalled();
});

test('does not capture when focus is in an input', () => {
  const onCapture = vi.fn();
  renderHook(() => useHybridFocus({ onCapture }));

  const input = document.createElement('input');
  document.body.appendChild(input);
  input.focus();

  const event = new KeyboardEvent('keydown', { key: '0', bubbles: true });
  Object.defineProperty(event, 'target', { value: input, configurable: true });
  window.dispatchEvent(event);

  expect(onCapture).not.toHaveBeenCalled();
  document.body.removeChild(input);
});
