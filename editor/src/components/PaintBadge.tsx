import './PaintBadge.css';

interface PaintBadgeProps {
  terrainKey: string;
  terrainColor: string;
  onExit: () => void;
}

export const PaintBadge = ({ terrainKey, terrainColor, onExit }: PaintBadgeProps) => (
  <div className="paint-badge">
    <div className="paint-badge-chip" style={{ backgroundColor: terrainColor }} />
    <span className="paint-badge-label">PAINT: {terrainKey}</span>
    <button className="paint-badge-exit" aria-label="Exit paint mode" onClick={onExit}>×</button>
  </div>
);
