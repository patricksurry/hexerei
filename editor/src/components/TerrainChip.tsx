import './TerrainChip.css';

interface TerrainChipProps {
  color: string;
  geometry: 'hex' | 'edge' | 'vertex';
  active?: boolean;
  title?: string;
}

export const TerrainChip = ({ color, geometry, active, title }: TerrainChipProps) => {
  const content = (() => {
    switch (geometry) {
      case 'hex':
        return <polygon points="8,1 15,5 15,11 8,15 1,11 1,5" />;
      case 'edge':
        return (
          <>
            <line x1="2" y1="8" x2="14" y2="8" strokeWidth="2.5" />
            <line x1="4" y1="6" x2="4" y2="10" strokeWidth="1" />
            <line x1="12" y1="6" x2="12" y2="10" strokeWidth="1" />
          </>
        );
      case 'vertex':
        return <circle cx="8" cy="8" r="5" />;
    }
  })();

  return (
    <div
      className={`terrain-chip terrain-chip-${geometry} ${active ? 'active' : ''}`}
      title={title}
    >
      <svg viewBox="0 0 16 16" width="16" height="16">
        <g
          fill={geometry === 'edge' ? 'none' : color}
          stroke={geometry === 'edge' ? color : 'none'}
        >
          {content}
        </g>
      </svg>
    </div>
  );
};
