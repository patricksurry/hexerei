import type { FeatureItem, MapCommand } from '@hexmap/canvas';
import { TerrainChip } from './TerrainChip';
import './FeatureStack.css';

interface FeatureStackProps {
  features: FeatureItem[];
  filteredIndices?: number[] | null; // null = no filter, [] = nothing matches
  selectedIndices?: number[];
  terrainColor?: (terrain: string, geometry: string) => string;
  onSelect?: (indices: number[], modifier: 'none' | 'shift' | 'cmd') => void;
  onHover?: (index: number | null) => void;
  dispatch?: (command: MapCommand) => void;
  orientation?: 'flat' | 'pointy';
}

export const FeatureStack = ({
  features,
  filteredIndices,
  selectedIndices = [],
  terrainColor,
  onSelect,
  onHover,
  dispatch,
  orientation,
}: FeatureStackProps) => {
  const getTerrainColor = (terrain: string, geometry: string) => {
    if (terrainColor) return terrainColor(terrain, geometry);
    return 'var(--text-muted)';
  };

  const visibleFeatures =
    filteredIndices != null ? features.filter((f) => filteredIndices.includes(f.index)) : features;

  const displayFeatures = [...visibleFeatures].reverse();

  return (
    <div className="feature-stack">
      <div className="feature-stack-header">
        {filteredIndices != null ? (
          <span>
            {filteredIndices.length} of {features.length} features
          </span>
        ) : (
          'FEATURE STACK'
        )}
        <button
          className="btn-icon"
          aria-label="Add feature"
          title="Add empty feature"
          onClick={() => dispatch?.({ type: 'addFeature', feature: { at: '' } })}
        >
          +
        </button>
      </div>
      <ul className="feature-list">
        {displayFeatures.map((feature) => {
          const isSelected = selectedIndices.includes(feature.index);
          const label =
            feature.label || feature.id || feature.terrain || `Feature ${feature.index}`;

          return (
            <li
              key={feature.index}
              aria-selected={isSelected}
              data-base={feature.isBase}
              className={`feature-item ${isSelected ? 'selected' : ''}`}
              onClick={(e) =>
                onSelect?.(
                  [feature.index],
                  e.shiftKey ? 'shift' : e.metaKey || e.ctrlKey ? 'cmd' : 'none'
                )
              }
              onMouseEnter={() => onHover?.(feature.index)}
              onMouseLeave={() => onHover?.(null)}
            >
              <div className="feature-main">
                <TerrainChip
                  color={getTerrainColor(feature.terrain, feature.geometryType)}
                  geometry={feature.geometryType}
                  orientation={orientation}
                />
                <div className="feature-info">
                  <div className="feature-label truncate">{label}</div>
                  <div className="feature-at font-mono truncate">
                    {feature.at}
                    <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                      {feature.isBase ? '(base)' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
