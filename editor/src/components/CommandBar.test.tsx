import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CommandBar } from './CommandBar';

test('renders the command bar input', () => {
  render(<CommandBar />);
  expect(screen.getByRole('combobox', { name: /command/i })).toBeInTheDocument();
});

test('calls onFocus when input receives focus', async () => {
  const onFocus = vi.fn();
  render(<CommandBar onFocus={onFocus} />);
  await userEvent.click(screen.getByRole('combobox'));
  expect(onFocus).toHaveBeenCalled();
});

test('calls onChange as user types', async () => {
  const onChange = vi.fn();
  const TestWrapper = () => {
    const [val, setVal] = useState('');
    return <CommandBar value={val} onChange={(v) => { setVal(v); onChange(v); }} />;
  };
  render(<TestWrapper />);
  await userEvent.type(screen.getByRole('combobox'), '0101');
  expect(onChange).toHaveBeenLastCalledWith('0101');
});

test('calls onClear and blurs on Escape', async () => {
  const onClear = vi.fn();
  render(<CommandBar value="0101" onClear={onClear} />);
  const input = screen.getByRole('combobox');
  await userEvent.click(input);
  await userEvent.keyboard('{Escape}');
  expect(onClear).toHaveBeenCalled();
});

test('displays mode indicator for command mode', () => {
  render(<CommandBar value=">zoom" />);
  expect(screen.getByText(/command/i)).toBeInTheDocument();
});

test('displays mode indicator for search mode', () => {
  render(<CommandBar value="/forest" />);
  expect(screen.getByText(/search/i)).toBeInTheDocument();
});

test('displays mode indicator for path mode by default', () => {
  render(<CommandBar value="0101 3ne" />);
  expect(screen.getByText(/path/i)).toBeInTheDocument();
});
