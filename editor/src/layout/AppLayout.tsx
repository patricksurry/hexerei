import type React from 'react';
import './AppLayout.css';

interface AppLayoutProps {
  commandBar: React.ReactNode;
  leftPanel: React.ReactNode;
  canvas: React.ReactNode;
  rightPanel: React.ReactNode;
  statusBar: React.ReactNode;
  leftPanelVisible?: boolean;
  rightPanelVisible?: boolean;
}

export const AppLayout = ({
  commandBar,
  leftPanel,
  canvas,
  rightPanel,
  statusBar,
  leftPanelVisible = true,
  rightPanelVisible = true,
}: AppLayoutProps) => (
  <div className="app-layout">
    <header className="layout-header">{commandBar}</header>
    <div className="layout-body">
      <aside
        aria-label="Features"
        className={`layout-panel layout-panel-left ${!leftPanelVisible ? 'collapsed' : ''}`}
        aria-hidden={!leftPanelVisible}
      >
        {leftPanel}
      </aside>
      <main className="layout-canvas">{canvas}</main>
      <aside
        aria-label="Inspector"
        className={`layout-panel layout-panel-right ${!rightPanelVisible ? 'collapsed' : ''}`}
        aria-hidden={!rightPanelVisible}
      >
        {rightPanel}
      </aside>
    </div>
    <footer role="contentinfo" className="layout-footer">
      {statusBar}
    </footer>
  </div>
);
