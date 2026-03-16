import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, beforeEach, afterEach, test, expect } from 'vitest';
import { App } from './App';
import { CommandHistory, MapModel } from '@hexmap/canvas';
import { HexMapDocument } from '@hexmap/core';

beforeEach(() => {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mac');

  // Mock fetch for the map file
  global.fetch = vi.fn().mockImplementation(() =>
    Promise.resolve({
      text: () =>
        Promise.resolve(`
hexmap: "1.0"
metadata:
  title: "Mock Map"
layout:
  orientation: flat-down
  label: XXYY
  all: "0101 - 0501 - 0505 - 0105 fill"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
      `),
    })
  );
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
  expect(screen.getByRole('combobox', { name: /command/i })).toHaveFocus();
});

test('CommandHistory survives undo/redo cycle (regression)', () => {
  const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;
  const doc = new HexMapDocument(yaml);
  const model = MapModel.fromDocument(doc);
  const history = new CommandHistory({ document: doc, model });

  // Execute two commands
  history.execute({ type: 'addFeature', feature: { at: '0101' } });
  history.execute({ type: 'addFeature', feature: { at: '0201' } });
  expect(history.currentState.model.features).toHaveLength(3);

  // Undo both
  history.undo();
  expect(history.currentState.model.features).toHaveLength(2);
  history.undo();
  expect(history.currentState.model.features).toHaveLength(1);

  // Redo both
  history.redo();
  expect(history.currentState.model.features).toHaveLength(2);
  history.redo();
  expect(history.currentState.model.features).toHaveLength(3);
});

test('Cmd+S shortcut marks document as saved and clears MODIFIED indicator', async () => {
  // Mock downloadFile dependencies
  const createObjectURLMock = vi.fn().mockReturnValue('blob:mock');
  const revokeObjectURLMock = vi.fn();
  const originalCreateObjectURL = window.URL.createObjectURL;
  const originalRevokeObjectURL = window.URL.revokeObjectURL;
  
  window.URL.createObjectURL = createObjectURLMock;
  window.URL.revokeObjectURL = revokeObjectURLMock;

  // Mock HTMLAnchorElement click so it doesn't navigate or error
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  try {
    render(<App />);

    // Wait for initial render and data fetch to complete
    const orientationSelect = await screen.findByDisplayValue('flat-down');
    
    // 1. Initial state: not modified
    expect(screen.queryByText('MODIFIED')).not.toBeInTheDocument();

    // 2. Make a change (change layout orientation to trigger a history update)
    await userEvent.selectOptions(orientationSelect, 'flat-up');

    // Verify MODIFIED appears
    expect(await screen.findByText('MODIFIED')).toBeVisible();

    // 3. Press Cmd+S (since we mocked userAgent to 'Mac' in beforeEach, metaKey represents mod)
    await userEvent.keyboard('{Meta>}s{/Meta}');

    // 4. MODIFIED should disappear
    expect(screen.queryByText('MODIFIED')).not.toBeInTheDocument();
  } finally {
    // Cleanup mocks
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
    clickSpy.mockRestore();
  }
});
