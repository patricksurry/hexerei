import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ColorPicker } from './ColorPicker';

test('renders color hex and color input', () => {
  render(<ColorPicker value="#ff0000" onChange={() => {}} />);
  expect(screen.getByText('#FF0000')).toBeInTheDocument();
  expect(screen.getByLabelText('Pick color')).toBeInTheDocument();
});

test('calls onChange with new color', () => {
  const onChange = vi.fn();
  render(<ColorPicker value="#ff0000" onChange={onChange} />);
  fireEvent.change(screen.getByLabelText('Pick color'), { target: { value: '#00ff00' } });
  expect(onChange).toHaveBeenCalledWith('#00ff00');
});
