import React from 'react';
import './StatusBar.css';

interface StatusBarProps {
  cursor?: string;
  zoom?: number;
  mapTitle?: string;
  dirty?: boolean;
}

export function StatusBar({
  cursor = '----',
  zoom = 100,
  mapTitle = 'Untitled',
  dirty = false,
}: StatusBarProps) {
  return (
    <div className="status-bar">
      <div className="status-segment status-cursor font-mono">
        {cursor}
      </div>
      <div className="status-segment status-zoom font-mono">
        {zoom}%
      </div>
      <div className="status-segment status-title">
        {mapTitle}
      </div>
      {dirty && (
        <div className="status-segment status-dirty">
          MODIFIED
        </div>
      )}
    </div>
  );
}
