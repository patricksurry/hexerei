import { render, screen } from '@testing-library/react';
import { AppLayout } from './AppLayout';

test('renders all layout regions', () => {
  render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
    />
  );

  expect(screen.getByRole('banner')).toBeInTheDocument(); // command bar
  expect(screen.getByRole('main')).toBeInTheDocument(); // canvas
  expect(screen.getByRole('complementary', { name: /features/i })).toBeInTheDocument();
  expect(screen.getByRole('complementary', { name: /inspector/i })).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // status bar
});

test('hides left panel when leftPanelVisible is false', () => {
  const { container } = render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
      leftPanelVisible={false}
    />
  );

  const panel = container.querySelector('.layout-panel-left');
  expect(panel).toBeInTheDocument();
  expect(panel).not.toBeVisible();
});

test('hides right panel when rightPanelVisible is false', () => {
  const { container } = render(
    <AppLayout
      commandBar={<div>command-bar</div>}
      leftPanel={<div>left-panel</div>}
      canvas={<div>canvas</div>}
      rightPanel={<div>right-panel</div>}
      statusBar={<div>status-bar</div>}
      rightPanelVisible={false}
    />
  );

  const panel = container.querySelector('.layout-panel-right');
  expect(panel).toBeInTheDocument();
  expect(panel).not.toBeVisible();
});
