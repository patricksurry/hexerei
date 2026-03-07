import React from 'react';
import { FeatureItem } from '../types';
import './FeatureStack.css';

interface FeatureStackProps {
  features: FeatureItem[];
  selectedIndices?: number[];
  onSelect?: (indices: number[]) => void;
  onHover?: (index: number | null) => void;
}

export function FeatureStack({
  features,
  selectedIndices = [],
  onSelect,
  onHover,
}: FeatureStackProps) {
  const getTerrainColor = (terrain?: string) => {
    if (!terrain) return 'var(--text-muted)';
    // Simple hash to hue
    let hash = 0;
    for (let i = 0; i < terrain.length; i++) {
      hash = terrain.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 60%, 50%)`;
  };

  return (
    <div className="feature-stack">
      <div className="feature-stack-header">
        FEATURE STACK
      </div>
      <ul className="feature-list" role="listbox">
        {features.map((feature) => {
          const isSelected = selectedIndices.includes(feature.index);
          const label = feature.label || feature.terrain || feature.id || `Feature ${feature.index}`;
          
          return (
            <li
              key={feature.index}
              role="listitem"
              aria-selected={isSelected}
              data-base={feature.isBase}
              className={`feature-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelect?.([feature.index])}
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
                <div className="feature-at font-mono truncate">{feature.at}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
