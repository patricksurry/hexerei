import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { PaintBadge } from './PaintBadge';

test('renders terrain name and exit button', () => {
  render(<PaintBadge terrainKey="forest" terrainColor="#2d6a1e" onExit={() => {}} />);
  expect(screen.getByText(/PAINT: forest/i)).toBeInTheDocument();
  expect(screen.getByLabelText('Exit paint mode')).toBeInTheDocument();
});

test('calls onExit when X clicked', () => {
  const onExit = vi.fn();
  render(<PaintBadge terrainKey="forest" terrainColor="#2d6a1e" onExit={onExit} />);
  fireEvent.click(screen.getByLabelText('Exit paint mode'));
  expect(onExit).toHaveBeenCalled();
});
