import { AppLayout } from './layout/AppLayout';

export function App() {
  return (
    <AppLayout
      commandBar={<div>Omni-Path</div>}
      leftPanel={<div>Feature Stack</div>}
      canvas={<div>Canvas</div>}
      rightPanel={<div>Inspector</div>}
      statusBar={<div>Status</div>}
    />
  );
}
