import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { OriginPicker } from './OriginPicker';

test('renders four origin options', () => {
  render(<OriginPicker value="top-left" onChange={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
});

test('calls onChange with selected origin', () => {
  const onChange = vi.fn();
  render(<OriginPicker value="top-left" onChange={onChange} />);
  fireEvent.click(screen.getByTitle('bottom-right'));
  expect(onChange).toHaveBeenCalledWith('bottom-right');
});

test('marks current value as selected', () => {
  render(<OriginPicker value="bottom-right" onChange={() => {}} />);
  const btn = screen.getByTitle('bottom-right');
  expect(btn.classList.contains('active')).toBe(true);
});
