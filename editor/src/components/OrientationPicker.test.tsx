import { render, screen, fireEvent } from '@testing-library/react';
import { OrientationPicker } from './OrientationPicker';
import { vi, test, expect } from 'vitest';

test('renders four orientation options', () => {
  render(<OrientationPicker value="flat-down" onChange={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(4);
});

test('calls onChange with selected orientation', () => {
  const onChange = vi.fn();
  render(<OrientationPicker value="flat-down" onChange={onChange} />);
  fireEvent.click(screen.getByTitle('pointy-right'));
  expect(onChange).toHaveBeenCalledWith('pointy-right');
});

test('marks current value as selected', () => {
  render(<OrientationPicker value="pointy-right" onChange={() => {}} />);
  const btn = screen.getByTitle('pointy-right');
  expect(btn.classList.contains('active')).toBe(true);
});
