import './TerrainChip.css';

interface TerrainChipProps {
  color: string;
  geometry: 'hex' | 'edge' | 'vertex';
  active?: boolean;
  title?: string;
  size?: number;
  orientation?: string;
}

export const TerrainChip = ({ color, geometry, active, title, size = 16, orientation = 'flat' }: TerrainChipProps) => {
  const isPointy = orientation.startsWith('pointy');
  const content = (() => {
    switch (geometry) {
      case 'hex':
        // Regular hexagon vertices, circumradius 7, centered at (8,8)
        return isPointy
          ? <polygon points="8,1 14.1,4.5 14.1,11.5 8,15 1.9,11.5 1.9,4.5" />
          : <polygon points="15,8 11.5,14.1 4.5,14.1 1,8 4.5,1.9 11.5,1.9" />;
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
      style={{ width: size + 4, height: size + 4 }}
    >
      <svg viewBox="0 0 16 16" width={size} height={size}>
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
