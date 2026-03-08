import { FeatureItem } from '../types';
import './FeatureStack.css';

interface FeatureStackProps {
  features: FeatureItem[];
  selectedIndices?: number[];
  terrainColor?: (terrain: string) => string;
  onSelect?: (indices: number[], modifier: 'none' | 'shift' | 'cmd') => void;
  onHover?: (index: number | null) => void;
}

export function FeatureStack({
  features,
  selectedIndices = [],
  terrainColor,
  onSelect,
  onHover,
}: FeatureStackProps) {
  const getTerrainColor = (terrain: string) => {
    if (terrainColor) return terrainColor(terrain);
    return 'var(--text-muted)';
  };

  return (
    <div className="feature-stack">
      <div className="feature-stack-header">
        FEATURE STACK
      </div>
      <ul className="feature-list" role="listbox">
        {features.map((feature) => {
          const isSelected = selectedIndices.includes(feature.index);
          const label = feature.label || 
            (feature.isBase ? "Base Layer" : (feature.terrain || feature.id || `Feature ${feature.index}`));
          
          return (
            <li
              key={feature.index}
              role="listitem"
              aria-selected={isSelected}
              data-base={feature.isBase}
              className={`feature-item ${isSelected ? 'selected' : ''}`}
              onClick={(e) => onSelect?.([feature.index], e.shiftKey ? 'shift' : e.metaKey || e.ctrlKey ? 'cmd' : 'none')}
              onMouseEnter={() => onHover?.(feature.index)}
              onMouseLeave={() => onHover?.(null)}
            >
              <div className="feature-drag-handle">⋮⋮</div>
              <div 
                className="feature-color-chip" 
                style={{ backgroundColor: getTerrainColor(feature.terrain) }}
              />
              <div className="feature-info">
                <div className="feature-label truncate">{label}</div>
                <div className="feature-at font-mono truncate">
                  {feature.at}{feature.isBase ? ' (base)' : ''}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
