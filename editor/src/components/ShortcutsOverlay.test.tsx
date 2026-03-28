import { render, screen, fireEvent } from '@testing-library/react';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { vi, test, expect } from 'vitest';

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
