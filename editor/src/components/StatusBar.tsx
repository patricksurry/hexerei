import './StatusBar.css';

interface StatusBarProps {
  cursor?: string;
  zoom?: number;
  mapTitle?: string;
  dirty?: boolean;
  paintTerrainKey?: string | null;
  paintTerrainColor?: string | null;
}

export const StatusBar = ({
  cursor = '----',
  zoom = 100,
  mapTitle = 'Untitled',
  dirty = false,
  paintTerrainKey = null,
  paintTerrainColor = null,
}: StatusBarProps) => (
  <div className="status-bar">
    <div className="status-segment status-cursor font-mono">
      <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '10px' }}>POS</span>
      <span style={{ color: 'var(--text-primary)' }}>{cursor}</span>
    </div>
    <div className="status-segment status-zoom font-mono">
      <span style={{ color: 'var(--text-muted)', marginRight: '8px', fontSize: '10px' }}>ZOOM</span>
      <span style={{ color: 'var(--text-primary)' }}>{zoom}%</span>
    </div>
    <div className="status-segment status-title">{mapTitle}</div>
    {paintTerrainKey && (
      <div className="status-segment status-paint">
        <span style={{ color: 'var(--accent-hex)', marginRight: '8px', fontSize: '10px', fontWeight: 'bold' }}>PAINT</span>
        <div style={{ display: 'inline-block', width: 10, height: 10, backgroundColor: paintTerrainColor || '#888', marginRight: '4px', verticalAlign: 'middle', border: '1px solid #000' }} />
        <span style={{ color: 'var(--text-primary)' }}>{paintTerrainKey} (Esc to exit)</span>
      </div>
    )}
    {dirty && <div className="status-segment status-dirty">MODIFIED</div>}
  </div>
);
