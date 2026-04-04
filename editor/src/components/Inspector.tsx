import {
  boundaryIdToHexPath,
  type MapCommand,
  type MapModel,
  type Selection,
  type TerrainDef,
  vertexIdToHexPath,
} from '@hexmap/canvas';
import { type Feature, Hex, HexPath, type TerrainTypeDef } from '@hexmap/core';
import { useState } from 'react';
import { CollapsibleSection } from './CollapsibleSection';
import { ColorPicker } from './ColorPicker';
import { OrientationPicker } from './OrientationPicker';
import { OriginPicker } from './OriginPicker';
import { TerrainChip } from './TerrainChip';
import { TerrainSelect } from './TerrainSelect';
import './Inspector.css';

const buildDef = (def: TerrainDef): TerrainTypeDef => ({
  type: def.type,
  name: def.name !== def.key ? def.name : undefined,
  style: { color: def.color },
  properties: def.properties,
});

interface InspectorProps {
  selection: Selection;
  model: MapModel | null;
  onSelectFeature?: (index: number) => void;
  dispatch?: (command: MapCommand) => void;
  paintTerrainKey?: string | null;
  paintGeometry?: 'hex' | 'edge' | 'vertex' | null;
  onPaintActivate?: (key: string | null, geometry?: 'hex' | 'edge' | 'vertex') => void;
}

export const Inspector = ({
  selection,
  model,
  onSelectFeature,
  dispatch,
  paintTerrainKey,
  paintGeometry,
  onPaintActivate,
}: InspectorProps) => {
  const [expandedTerrain, setExpandedTerrain] = useState<{
    key: string;
    geometry: 'hex' | 'edge' | 'vertex';
  } | null>(null);

  const [terrainTab, setTerrainTab] = useState<'hex' | 'edge' | 'vertex'>('hex');

  if (!model)
    return (
      <div className="inspector">
        <div className="inspector-header">INSPECTOR</div>
        <div className="inspector-content">
          <p className="placeholder-text">No map loaded</p>
          <p className="placeholder-text">Press Cmd+N to create or Cmd+O to open</p>
        </div>
      </div>
    );

  const terrainUsageCount = (key: string, geometry: 'hex' | 'edge' | 'vertex'): number => {
    if (!model) return 0;
    return model.features.filter(
      (f) => f.geometryType === geometry && f.terrain === key
    ).length;
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      e.currentTarget.value = e.currentTarget.defaultValue;
      e.currentTarget.blur();
    }
  };

  const renderTerrainSection = (
    geometry: 'hex' | 'edge' | 'vertex',
    title: string,
    defs: Map<string, TerrainDef>
  ) => (
    <CollapsibleSection title={title}>
      <div className="terrain-grid">
        {Array.from(defs.entries()).map(([key, def]) => {
          const isExpanded = expandedTerrain?.key === key && expandedTerrain?.geometry === geometry;
          const isPaintActive =
            paintTerrainKey === key && (!paintGeometry || paintGeometry === geometry);

          return (
            <div key={key} style={{ display: 'contents' }}>
              <div
                role="button"
                tabIndex={0}
                className={`terrain-grid-cell ${isPaintActive ? 'paint-active' : ''}`}
                onClick={() => onPaintActivate?.(isPaintActive ? null : key, geometry)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setExpandedTerrain(isExpanded ? null : { key, geometry });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onPaintActivate?.(isPaintActive ? null : key, geometry);
                  }
                }}
                title={
                  isPaintActive
                    ? 'Click to exit paint mode'
                    : `${key}${def.name !== key ? ` (${def.name})` : ''} — click to paint, double-click to edit`
                }
              >
                <TerrainChip
                  color={def.color}
                  geometry={geometry}
                  active={isPaintActive}
                  size={48}
                  orientation={model?.grid.orientation}
                />
                <span className="terrain-grid-label">{key}</span>
              </div>
              {isExpanded && (
                <div className="terrain-edit-form terrain-edit-form-grid">
                  <div className="inspector-row">
                    <label htmlFor={`terrain-key-${key}`}>Key</label>
                    <input
                      id={`terrain-key-${key}`}
                      type="text"
                      className="inspector-input"
                      defaultValue={key}
                      key={`tk-${key}`}
                      onKeyDown={handleInputKeyDown}
                      onBlur={(e) => {
                        const newKey = e.target.value.trim();
                        if (newKey && newKey !== key) {
                          dispatch?.({
                            type: 'deleteTerrainType',
                            geometry,
                            key,
                          });
                          dispatch?.({
                            type: 'setTerrainType',
                            geometry,
                            key: newKey,
                            def: buildDef(def),
                          });
                          setExpandedTerrain({ key: newKey, geometry });
                        }
                      }}
                    />
                  </div>
                  <div className="inspector-row">
                    <label htmlFor={`terrain-type-${key}`}>Type</label>
                    <select
                      id={`terrain-type-${key}`}
                      className="inspector-select"
                      defaultValue={def.type || 'base'}
                      key={`tt-${key}-${def.type}`}
                      onChange={(e) => {
                        const newType = e.target.value as 'base' | 'modifier';
                        if (newType !== def.type) {
                          dispatch?.({
                            type: 'setTerrainType',
                            geometry,
                            key,
                            def: {
                              ...buildDef(def),
                              type: newType,
                            },
                          });
                        }
                      }}
                    >
                      <option value="base">base</option>
                      <option value="modifier">modifier</option>
                    </select>
                  </div>
                  <div className="inspector-row">
                    <label>Color</label>
                    <div className="inspector-color-row">
                      <ColorPicker
                        value={def.color}
                        onChange={(newColor) => {
                          if (newColor !== def.color) {
                            dispatch?.({
                              type: 'setTerrainType',
                              geometry,
                              key,
                              def: {
                                ...buildDef(def),
                                style: { color: newColor },
                              },
                            });
                          }
                        }}
                      />
                      <input
                        type="text"
                        className="inspector-input inspector-hex-input font-mono"
                        defaultValue={def.color}
                        key={`tc-${key}-${def.color}`}
                        onKeyDown={handleInputKeyDown}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (/^#[0-9a-fA-F]{3,8}$/.test(v) && v !== def.color) {
                            dispatch?.({
                              type: 'setTerrainType',
                              geometry,
                              key,
                              def: {
                                ...buildDef(def),
                                style: { color: v },
                              },
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="inspector-row">
                    <label>Name</label>
                    <input
                      type="text"
                      className="inspector-input"
                      defaultValue={def.name}
                      key={`tn-${key}-${def.name}`}
                      onKeyDown={handleInputKeyDown}
                      onBlur={(e) => {
                        const newName = e.target.value || undefined;
                        if (newName !== def.name) {
                          dispatch?.({
                            type: 'setTerrainType',
                            geometry,
                            key,
                            def: { ...buildDef(def), name: newName },
                          });
                        }
                      }}
                    />
                  </div>
                  {geometry === 'hex' && (
                    <div className="inspector-row">
                      <label htmlFor={`terrain-path-${key}`}>Path</label>
                      <input
                        id={`terrain-path-${key}`}
                        type="checkbox"
                        checked={!!def.properties?.path}
                        onChange={(e) => {
                          const newProps = { ...(def.properties ?? {}) };
                          if (e.target.checked) {
                            newProps.path = true;
                          } else {
                            delete newProps.path;
                          }
                          dispatch?.({
                            type: 'setTerrainType',
                            geometry,
                            key,
                            def: {
                              ...buildDef(def),
                              properties: Object.keys(newProps).length > 0 ? newProps : undefined,
                            },
                          });
                        }}
                      />
                    </div>
                  )}
                  <div className="terrain-edit-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => setExpandedTerrain(null)}
                    >
                      Close
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => {
                        const count = terrainUsageCount(key, geometry);
                        if (count > 0) {
                          if (!window.confirm(
                            `"${key}" is used by ${count} feature${count !== 1 ? 's' : ''}. ` +
                            `Deleting will remove terrain from those features. Continue?`
                          )) return;
                        }
                        dispatch?.({
                          type: 'deleteTerrainType',
                          geometry,
                          key,
                        });
                        setExpandedTerrain(null);
                      }}
                    >
                      Delete terrain
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="btn-secondary"
        style={{ marginTop: '12px', width: '100%' }}
        onClick={() => {
          let nextId = defs.size + 1;
          while (defs.has(`terrain_${nextId}`)) {
            nextId++;
          }
          const newKey = `terrain_${nextId}`;
          dispatch?.({
            type: 'setTerrainType',
            geometry,
            key: newKey,
            def: { style: { color: '#888888' } },
          });
          setExpandedTerrain({ key: newKey, geometry });
        }}
      >
        + Add {geometry.charAt(0).toUpperCase() + geometry.slice(1)} Terrain
      </button>
    </CollapsibleSection>
  );
  const renderMetadata = () => (
    <div className="inspector-content">
      <section className="inspector-section">
        <h3 className="inspector-section-header">MAP METADATA</h3>
        <div className="inspector-row">
          <label>Title</label>
          <input
            type="text"
            className="inspector-input"
            defaultValue={model.metadata.title || ''}
            key={`meta-title-${model.metadata.title}`}
            onKeyDown={handleInputKeyDown}
            onBlur={(e) => {
              const value = e.target.value || undefined;
              if (value !== (model.metadata.title || undefined)) {
                dispatch?.({ type: 'setMetadata', key: 'title', value });
              }
            }}
          />
        </div>
        <div className="inspector-row">
          <label>Designer</label>
          <input
            type="text"
            className="inspector-input"
            defaultValue={model.metadata.designer || ''}
            key={`meta-designer-${model.metadata.designer}`}
            onKeyDown={handleInputKeyDown}
            onBlur={(e) => {
              const value = e.target.value || undefined;
              if (value !== (model.metadata.designer || undefined)) {
                dispatch?.({ type: 'setMetadata', key: 'designer', value });
              }
            }}
          />
        </div>
        <div className="inspector-row">
          <label>Description</label>
          <input
            type="text"
            className="inspector-input"
            defaultValue={model.metadata.description || ''}
            key={`meta-description-${model.metadata.description}`}
            onKeyDown={handleInputKeyDown}
            onBlur={(e) => {
              const value = e.target.value || undefined;
              if (value !== (model.metadata.description || undefined)) {
                dispatch?.({ type: 'setMetadata', key: 'description', value });
              }
            }}
          />
        </div>
      </section>
      <CollapsibleSection title="LAYOUT">
        <div className="inspector-row">
          <label>Orientation</label>
          <OrientationPicker
            value={model.grid.orientation}
            onChange={(val) => dispatch?.({ type: 'setLayout', key: 'orientation', value: val })}
          />
        </div>
        <div className="inspector-row">
          <label>Origin</label>
          <OriginPicker
            value={(model.document.getLayout().origin as any) || 'top-left'}
            onChange={(val) => dispatch?.({ type: 'setLayout', key: 'origin', value: val })}
          />
        </div>
        <div className="inspector-row">
          <label>Label Format</label>
          <select
            className="inspector-input font-mono"
            value={model.grid.labelFormat}
            onChange={(e) => {
              if (e.target.value !== model.grid.labelFormat) {
                dispatch?.({ type: 'setLayout', key: 'label', value: e.target.value });
              }
            }}
          >
            <option value="XXYY">XXYY</option>
            <option value="XX.YY">XX.YY</option>
            <option value="AYY">AYY</option>
          </select>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="TERRAIN">
        <div className="terrain-tabs">
          {(['hex', 'edge', 'vertex'] as const).map((geo) => (
            <button
              key={geo}
              className={`terrain-tab ${terrainTab === geo ? 'active' : ''} terrain-tab-${geo}`}
              onClick={() => setTerrainTab(geo)}
            >
              {geo}
            </button>
          ))}
        </div>
        {renderTerrainSection(
          terrainTab,
          `${terrainTab.toUpperCase()} TERRAIN`,
          model.terrainDefs(terrainTab)
        )}
      </CollapsibleSection>
    </div>
  );

  const renderFeature = (indices: number[]) => {
    const featureIndex = indices[0];
    const feature = model.features[featureIndex];
    if (!feature) return <div className="inspector-content">Feature not found</div>;

    if (indices.length > 1) {
      return (
        <div className="inspector-content">
          <section className="inspector-section">
            <h3 className="inspector-section-header">MULTIPLE SELECTED</h3>
            <p className="placeholder-text">{indices.length} features selected</p>
          </section>
          <div className="inspector-actions">
            <button
              className="btn-danger"
              onClick={() => {
                // Delete in reverse order to preserve indices
                for (const idx of [...indices].sort((a, b) => b - a)) {
                  dispatch?.({ type: 'deleteFeature', index: idx });
                }
              }}
            >
              Delete ({indices.length})
            </button>
          </div>
        </div>
      );
    }

    const handleFieldBlur = (key: keyof Feature, value: string | number | undefined) => {
      const currentValue = feature[key];
      // Normalize empty strings to undefined (clear the field), but preserve 0
      const normalized = value === '' ? undefined : value;
      if (normalized !== currentValue) {
        dispatch?.({ type: 'updateFeature', index: featureIndex, changes: { [key]: normalized } });
      }
    };

    const isAllFeature = feature.at.trim() === '@all';
    let expandedAt = feature.at;
    let atomCount: number | null = null;
    if (model) {
      try {
        const hp = new HexPath(model.mesh, {
          labelFormat: model.grid.labelFormat,
          orientation: model.grid.orientation,
          firstCol: model.grid.firstCol,
          firstRow: model.grid.firstRow,
        });
        const resolved = hp.resolve(feature.at);
        atomCount = resolved.items.length;
        if (isAllFeature) {
          expandedAt = hp.serialize(
            resolved.items.map((id) => [id]),
            resolved.type
          );
        }
      } catch {
        // If resolve fails, show raw text
      }
    }

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-section-header">FEATURE PROPERTIES</h3>
          <div className="inspector-row">
            <label>Label</label>
            <input
              type="text"
              className="inspector-input"
              defaultValue={feature.label || ''}
              key={`label-${featureIndex}-${feature.label}`}
              onKeyDown={handleInputKeyDown}
              onBlur={(e) => handleFieldBlur('label', e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label>ID</label>
            {isAllFeature ? (
              <span className="font-mono">all</span>
            ) : (
              <input
                type="text"
                className="inspector-input font-mono"
                defaultValue={feature.id || ''}
                key={`id-${featureIndex}-${feature.id}`}
                onKeyDown={handleInputKeyDown}
                onBlur={(e) => handleFieldBlur('id', e.target.value)}
              />
            )}
          </div>
          <div className="inspector-row">
            <label>Terrain</label>
            <TerrainSelect
              value={feature.terrain || ''}
              terrainDefs={model.terrainDefs(feature.geometryType)}
              geometry={feature.geometryType}
              orientation={model.grid.orientation}
              onChange={(key) => handleFieldBlur('terrain', key)}
            />
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-section-header">GEOMETRY</h3>
          <div className="inspector-row">
            <label>At</label>
            <div style={{ flex: 1 }}>
              {isAllFeature ? (
                atomCount !== null && atomCount > 20 ? (
                  <details className="inspector-at-details">
                    <summary className="font-mono inspector-at-readonly">
                      @all ({atomCount} {feature.geometryType === 'hex'
                        ? 'hexes' : feature.geometryType === 'edge'
                        ? 'edges' : 'vertices'})
                    </summary>
                    <span className="font-mono inspector-at-readonly">{expandedAt}</span>
                  </details>
                ) : (
                  <span className="font-mono inspector-at-readonly">{expandedAt}</span>
                )
              ) : (
                <textarea
                  className="inspector-input inspector-at-textarea font-mono"
                  defaultValue={feature.at}
                  key={`at-${featureIndex}-${feature.at}`}
                  rows={Math.min(Math.max(Math.ceil(feature.at.length / 40), 1), 6)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === 'Escape') {
                      e.currentTarget.value = e.currentTarget.defaultValue;
                      e.currentTarget.blur();
                    }
                  }}
                  onBlur={(e) => handleFieldBlur('at', e.target.value)}
                />
              )}
              {atomCount !== null && (
                <div className="inspector-hint">
                  {atomCount}{' '}
                  {feature.geometryType === 'hex'
                    ? atomCount !== 1
                      ? 'hexes'
                      : 'hex'
                    : feature.geometryType === 'edge'
                      ? atomCount !== 1
                        ? 'edges'
                        : 'edge'
                      : atomCount !== 1
                        ? 'vertices'
                        : 'vertex'}
                </div>
              )}
            </div>
          </div>
          <div className="inspector-row">
            <label>Elevation</label>
            <input
              type="number"
              className="inspector-input"
              defaultValue={feature.elevation ?? ''}
              key={`elevation-${featureIndex}-${feature.elevation}`}
              onKeyDown={handleInputKeyDown}
              onBlur={(e) => {
                const val = e.target.value ? Number(e.target.value) : undefined;
                handleFieldBlur('elevation', val);
              }}
            />
          </div>
        </section>
        <div className="inspector-actions">
          <button
            className="btn-secondary"
            onClick={() => {
              const { features } = model;
              const f = features[featureIndex];
              dispatch?.({
                type: 'addFeature',
                feature: {
                  at: f.at,
                  terrain: f.terrain,
                  label: f.label ? `${f.label} (copy)` : undefined,
                },
              });
            }}
          >
            Duplicate
          </button>
          <button
            className="btn-danger"
            onClick={() => dispatch?.({ type: 'deleteFeature', index: featureIndex })}
          >
            Delete
          </button>
        </div>
      </div>
    );
  };

  const renderHex = (hexId: string) => {
    const state = model.computedHex(hexId);
    if (!state) return <div className="inspector-content">Hex {hexId} not found in mesh.</div>;

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-section-header">COORDINATE</h3>
          <div className="inspector-row">
            <label>Label</label>
            <span className="font-mono">{state.label}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-section-header">TERRAIN</h3>
          <div className="inspector-row">
            <label>Name</label>
            <span>{state.terrain}</span>
          </div>
          <div className="inspector-row">
            <label>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: state.terrainColor,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}
              />
              <span className="font-mono">{state.terrainColor}</span>
            </div>
          </div>
        </section>
        <CollapsibleSection title="CONTRIBUTING FEATURES">
          <ul className="inspector-list">
            {state.contributingFeatures.map((f) => (
              <li
                key={f.index}
                className="inspector-list-item clickable"
                onClick={() => onSelectFeature?.(f.index)}
              >
                {f.label || f.terrain} {f.isBase && '(Base)'}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
        <CollapsibleSection title="NEIGHBORS">
          <div className="neighbor-grid">
            {state.neighborLabels.map((l) => (
              <span key={l} className="font-mono">
                {l}
              </span>
            ))}
          </div>
        </CollapsibleSection>
        <div className="inspector-actions">
          <button
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={() => {
              dispatch?.({ type: 'addFeature', feature: { at: state.label } });
            }}
          >
            + Add Feature Here
          </button>
        </div>
      </div>
    );
  };

  const renderEdge = (boundaryId: string, hexLabels: [string, string | null]) => {
    const edgeFeatures = model.featuresAtEdge(boundaryId);
    const topmost = edgeFeatures.length > 0 ? edgeFeatures[edgeFeatures.length - 1] : null;
    const terrain = topmost?.terrain ?? 'none';
    const color = model.terrainColor('edge', terrain);

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-section-header">BOUNDARY</h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono text-xs">{boundaryId}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-section-header">TERRAIN</h3>
          <div className="inspector-row">
            <label>Name</label>
            <span>{terrain}</span>
          </div>
          <div className="inspector-row">
            <label>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: color,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}
              />
              <span className="font-mono">{color}</span>
            </div>
          </div>
        </section>
        <CollapsibleSection title="CONTRIBUTING FEATURES">
          <ul className="inspector-list">
            {edgeFeatures.map((f) => (
              <li
                key={f.index}
                className="inspector-list-item clickable"
                onClick={() => onSelectFeature?.(f.index)}
              >
                {f.label || f.terrain}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
        <section className="inspector-section">
          <h3 className="inspector-section-header">ADJACENT HEXES</h3>
          <div className="inspector-row">
            <label>Hex A</label>
            <span className="font-mono">{hexLabels[0]}</span>
          </div>
          <div className="inspector-row">
            <label>Hex B</label>
            <span className="font-mono">{hexLabels[1] || 'VOID'}</span>
          </div>
        </section>
        <div className="inspector-actions">
          <button
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={() => {
              dispatch?.({
                type: 'addFeature',
                feature: { at: boundaryIdToHexPath(boundaryId, model) },
              });
            }}
          >
            + Add Feature Here
          </button>
        </div>
      </div>
    );
  };

  const renderVertex = (vertexId: string) => {
    const vertexFeatures = model.featuresAtVertex(vertexId);
    const topmost = vertexFeatures.length > 0 ? vertexFeatures[vertexFeatures.length - 1] : null;
    const terrain = topmost?.terrain ?? 'none';
    const color = model.terrainColor('vertex', terrain);

    const meetingHexes = vertexId
      .split('^')
      .map((id) =>
        Hex.formatHexLabel(
          Hex.hexFromId(id),
          model.grid.labelFormat,
          model.grid.orientation,
          model.grid.firstCol,
          model.grid.firstRow
        )
      );
    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-section-header">JUNCTION</h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono text-xs">{vertexId}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-section-header">TERRAIN</h3>
          <div className="inspector-row">
            <label>Name</label>
            <span>{terrain}</span>
          </div>
          <div className="inspector-row">
            <label>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  background: color,
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 0 4px rgba(0,0,0,0.5)',
                }}
              />
              <span className="font-mono">{color}</span>
            </div>
          </div>
        </section>
        <CollapsibleSection title="CONTRIBUTING FEATURES">
          <ul className="inspector-list">
            {vertexFeatures.map((f) => (
              <li
                key={f.index}
                className="inspector-list-item clickable"
                onClick={() => onSelectFeature?.(f.index)}
              >
                {f.label || f.terrain}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
        <CollapsibleSection title="MEETING HEXES">
          <ul className="inspector-list">
            {meetingHexes.map((l) => (
              <li key={l} className="font-mono">
                {l}
              </li>
            ))}
          </ul>
        </CollapsibleSection>
        <div className="inspector-actions">
          <button
            className="btn-secondary"
            style={{ marginTop: '12px', width: '100%' }}
            onClick={() => {
              dispatch?.({
                type: 'addFeature',
                feature: { at: vertexIdToHexPath(vertexId, model) },
              });
            }}
          >
            + Add Feature Here
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="inspector">
      <div className="inspector-header">INSPECTOR</div>
      {selection.type === 'none' && renderMetadata()}
      {selection.type === 'feature' && renderFeature(selection.indices)}
      {selection.type === 'hex' && renderHex(selection.hexId)}
      {selection.type === 'edge' && renderEdge(selection.boundaryId, selection.hexLabels)}
      {selection.type === 'vertex' && renderVertex(selection.vertexId)}
    </div>
  );
};
