import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach } from 'vitest';
import { App } from './App';

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mac');
});

afterEach(() => {
  vi.restoreAllMocks();
});

test('renders all layout regions', () => {
  render(<App />);
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('main')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
});

test('Cmd+1 toggles Feature Stack visibility', async () => {
  render(<App />);
  const panel = screen.getByRole('complementary', { name: /features/i });
  expect(panel).toBeVisible();

  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(panel).not.toBeVisible();

  await userEvent.keyboard('{Meta>}1{/Meta}');
  expect(panel).toBeVisible();
});

test('Cmd+2 toggles Inspector visibility', async () => {
  render(<App />);
  const panel = screen.getByRole('complementary', { name: /inspector/i });
  expect(panel).toBeVisible();

  await userEvent.keyboard('{Meta>}2{/Meta}');
  expect(panel).not.toBeVisible();

  await userEvent.keyboard('{Meta>}2{/Meta}');
  expect(panel).toBeVisible();
});

test('Cmd+K focuses the command bar', async () => {
  render(<App />);
  await userEvent.keyboard('{Meta>}k{/Meta}');
  expect(screen.getByRole('combobox')).toHaveFocus();
});
