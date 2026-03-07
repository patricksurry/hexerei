import { render, screen } from '@testing-library/react';
import { CanvasPlaceholder } from './CanvasPlaceholder';

test('renders placeholder with drop target hint', () => {
  render(<CanvasPlaceholder />);
  expect(screen.getByText(/canvas/i)).toBeInTheDocument();
});

test('fills its container', () => {
  const { container } = render(<CanvasPlaceholder />);
  const el = container.firstElementChild as HTMLElement;
  expect(el.classList.contains('canvas-placeholder')).toBe(true);
});
