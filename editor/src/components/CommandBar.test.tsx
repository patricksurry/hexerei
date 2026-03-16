import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, test, expect } from 'vitest';
import { CommandBar } from './CommandBar';

test('renders the command bar input', () => {
  render(<CommandBar />);
  expect(screen.getByRole('combobox', { name: /command/i })).toBeInTheDocument();
});

test('calls onChange as user types', async () => {
  const onChange = vi.fn();
  const TestWrapper = () => {
    const [val, setVal] = useState('');
    return (
      <CommandBar
        value={val}
        onChange={(v) => {
          setVal(v);
          onChange(v);
        }}
      />
    );
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

test('shows key dropdown when value is "/"', () => {
  render(<CommandBar value="/" onChange={() => {}} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('terrain')).toBeDefined();
  expect(screen.getByText('label')).toBeDefined();
  expect(screen.getByText('id')).toBeDefined();
  expect(screen.getByText('at')).toBeDefined();
  expect(screen.getByText('tags')).toBeDefined();
});

test('hides key dropdown when value has a colon', () => {
  render(<CommandBar value="/terrain:" onChange={() => {}} />);
  expect(screen.queryByRole('listbox')).toBeNull();
});

test('clicking a key in dropdown appends it to value', () => {
  const onChange = vi.fn();
  render(<CommandBar value="/" onChange={onChange} />);
  fireEvent.click(screen.getByText('terrain'));
  expect(onChange).toHaveBeenCalledWith('/terrain:');
});

test('displays GOTO mode badge for @ prefix', () => {
  render(<CommandBar value="@" onChange={() => {}} />);
  expect(screen.getByText('GOTO')).toBeDefined();
});

test('shows feature suggestions in GOTO mode', () => {
  const suggestions = [
    { label: 'River', index: 1 },
    { label: 'Forest', index: 2 },
  ];
  render(<CommandBar value="@r" onChange={() => {}} gotoSuggestions={suggestions} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('River')).toBeDefined();
});

test('shows command dropdown when value is ">"', () => {
  render(<CommandBar value=">" onChange={() => {}} />);
  expect(screen.getByRole('listbox')).toBeDefined();
  expect(screen.getByText('export yaml')).toBeDefined();
  expect(screen.getByText('zoom fit')).toBeDefined();
  expect(screen.getByText('clear')).toBeDefined();
});

test('clicking a command in dropdown sets the value', () => {
  const onChange = vi.fn();
  render(<CommandBar value=">" onChange={onChange} />);
  fireEvent.click(screen.getByText('export yaml'));
  expect(onChange).toHaveBeenCalledWith('>export yaml');
});
