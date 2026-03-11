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
        <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '10px' }}>POS</span>
        <span style={{ color: 'var(--text-primary)' }}>{cursor}</span>
      </div>
      <div className="status-segment status-zoom font-mono">
        <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '10px' }}>ZOOM</span>
        <span style={{ color: 'var(--text-primary)' }}>{zoom}%</span>
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
