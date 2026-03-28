import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ShortcutsOverlay } from './ShortcutsOverlay';

test('renders shortcut list', () => {
  render(<ShortcutsOverlay onClose={() => {}} />);
  expect(screen.getByText(/Keyboard Shortcuts/i)).toBeInTheDocument();
  expect(screen.getByText(/Cmd\+N/)).toBeInTheDocument();
  expect(screen.getByText(/Cmd\+K/)).toBeInTheDocument();
});

test('closes on Escape', () => {
  const onClose = vi.fn();
  render(<ShortcutsOverlay onClose={onClose} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});

test('closes on backdrop click', () => {
  const onClose = vi.fn();
  render(<ShortcutsOverlay onClose={onClose} />);
  fireEvent.click(screen.getByRole('dialog').parentElement!);
  expect(onClose).toHaveBeenCalled();
});
