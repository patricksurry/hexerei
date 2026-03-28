import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeScreen } from './WelcomeScreen';
import { vi, test, expect } from 'vitest';

test('renders create and open buttons', () => {
  const onNew = vi.fn();
  const onOpen = vi.fn();
  render(<WelcomeScreen onNewMap={onNew} onOpenMap={onOpen} />);
  expect(screen.getByText(/create new map/i)).toBeInTheDocument();
  expect(screen.getByText(/open existing map/i)).toBeInTheDocument();
});

test('calls onNewMap when create button clicked', () => {
  const onNew = vi.fn();
  render(<WelcomeScreen onNewMap={onNew} onOpenMap={() => {}} />);
  fireEvent.click(screen.getByText(/create new map/i));
  expect(onNew).toHaveBeenCalled();
});

test('calls onOpenMap when open button clicked', () => {
  const onOpen = vi.fn();
  render(<WelcomeScreen onNewMap={() => {}} onOpenMap={onOpen} />);
  fireEvent.click(screen.getByText(/open existing map/i));
  expect(onOpen).toHaveBeenCalled();
});
