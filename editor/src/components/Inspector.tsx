import { Hex, Feature, TerrainTypeDef } from '@hexmap/core';
import { Selection, MapModel, MapCommand, TerrainDef } from '@hexmap/canvas';
import { useState } from 'react';
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
  onPaintActivate?: (key: string | null, geometry?: 'hex' | 'edge' | 'vertex') => void;
}

export const Inspector = ({ selection, model, onSelectFeature, dispatch, paintTerrainKey, onPaintActivate }: InspectorProps) => {
  const [expandedTerrain, setExpandedTerrain] = useState<{
    key: string;
    geometry: 'hex' | 'edge' | 'vertex';
  } | null>(null);

  if (!model)
    return (
      <div className="inspector">
        <div className="inspector-content">Loading...</div>
      </div>
    );

  const renderTerrainSection = (
    geometry: 'hex' | 'edge' | 'vertex',
    title: string,
    defs: Map<string, TerrainDef>
  ) => (
    <section className="inspector-section">
      <h3
        className="inspector-header"
        style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
      >
        {title}
      </h3>
      <ul className="terrain-list">
        {Array.from(defs.entries()).map(([key, def]) => {
          const isExpanded = expandedTerrain?.key === key && expandedTerrain?.geometry === geometry;
          const isPaintActive = paintTerrainKey === key; // TODO: handle geometry match in paintState

          return (
            <li
              key={key}
              className={`terrain-row ${isExpanded ? 'expanded' : ''} ${
                isPaintActive ? 'paint-active' : ''
              }`}
            >
              <div
                className="terrain-row-header"
                onClick={() =>
                  setExpandedTerrain(isExpanded ? null : { key, geometry })
                }
              >
                <div
                  className={`terrain-color-chip ${isPaintActive ? 'active' : ''}`}
                  style={{ backgroundColor: def.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPaintActivate?.(isPaintActive ? null : key, geometry);
                  }}
                  title="Click to paint with this terrain"
                />
                <span className="terrain-key">{key}</span>
                {def.name !== key && <span className="terrain-name">{def.name}</span>}
                <button
                  className="btn-icon btn-danger-icon"
                  aria-label="Delete terrain"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch?.({
                      type: 'deleteTerrainType',
                      geometry,
                      key,
                    });
                    if (isExpanded) setExpandedTerrain(null);
                  }}
                >
                  x
                </button>
              </div>
              {isExpanded && (
                <div className="terrain-edit-form">
                  <div className="inspector-row">
                    <label htmlFor={`terrain-key-${key}`}>Key</label>
                    <input
                      id={`terrain-key-${key}`}
                      type="text"
                      className="inspector-input"
                      defaultValue={key}
                      key={`tk-${key}`}
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
                    <label htmlFor={`terrain-color-${key}`}>Color</label>
                    <input
                      id={`terrain-color-${key}`}
                      type="color"
                      aria-label="Terrain color"
                      defaultValue={def.color}
                      key={`tc-${key}-${def.color}`}
                      onBlur={(e) => {
                        if (e.target.value !== def.color) {
                          dispatch?.({
                            type: 'setTerrainType',
                            geometry,
                            key,
                            def: {
                              ...buildDef(def),
                              style: { color: e.target.value },
                            },
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="inspector-row">
                    <label>Name</label>
                    <input
                      type="text"
                      className="inspector-input"
                      defaultValue={def.name}
                      key={`tn-${key}-${def.name}`}
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
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <button
        className="btn-secondary"
        style={{ marginTop: '12px', width: '100%' }}
        onClick={() => {
          let nextId = defs.size + 1;
          while (defs.has(`terrain_${nextId}`)) {
            nextId++;
          }
          dispatch?.({
            type: 'setTerrainType',
            geometry,
            key: `terrain_${nextId}`,
            def: { style: { color: '#888888' } },
          });
        }}
      >
        + Add {geometry.charAt(0).toUpperCase() + geometry.slice(1)} Terrain
      </button>
    </section>
  );
  const renderMetadata = () => (
    <div className="inspector-content">
      <section className="inspector-section">
        <h3
          className="inspector-header"
          style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
        >
          MAP METADATA
        </h3>
        <div className="inspector-row">
          <label>Title</label>
          <input
            type="text"
            className="inspector-input"
            defaultValue={model.metadata.title || ''}
            key={`meta-title-${model.metadata.title}`}
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
            onBlur={(e) => {
              const value = e.target.value || undefined;
              if (value !== (model.metadata.description || undefined)) {
                dispatch?.({ type: 'setMetadata', key: 'description', value });
              }
            }}
          />
        </div>
      </section>
      <section className="inspector-section">
        <h3
          className="inspector-header"
          style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
        >
          LAYOUT
        </h3>
        <div className="inspector-row">
          <label>Orientation</label>
          <select
            className="inspector-select"
            defaultValue={model.grid.orientation}
            key={`layout-orientation-${model.grid.orientation}`}
            onChange={(e) => {
              dispatch?.({ type: 'setLayout', key: 'orientation', value: e.target.value });
            }}
          >
            <option value="flat-down">flat-down</option>
            <option value="flat-up">flat-up</option>
            <option value="pointy-right">pointy-right</option>
            <option value="pointy-left">pointy-left</option>
          </select>
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
      </section>
      {renderTerrainSection('hex', 'HEX TERRAIN', model.terrainDefs('hex'))}
      {renderTerrainSection('edge', 'EDGE TERRAIN', model.terrainDefs('edge'))}
      {renderTerrainSection('vertex', 'VERTEX TERRAIN', model.terrainDefs('vertex'))}
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
            <h3
              className="inspector-header"
              style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
            >
              MULTIPLE SELECTED
            </h3>
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

    const terrainKeys = Array.from(model.terrainDefs(feature.geometryType).keys());

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            FEATURE PROPERTIES
          </h3>
          <div className="inspector-row">
            <label>Label</label>
            <input
              type="text"
              className="inspector-input"
              defaultValue={feature.label || ''}
              key={`label-${featureIndex}-${feature.label}`}
              onBlur={(e) => handleFieldBlur('label', e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label>ID</label>
            <input
              type="text"
              className="inspector-input font-mono"
              defaultValue={feature.id || ''}
              key={`id-${featureIndex}-${feature.id}`}
              onBlur={(e) => handleFieldBlur('id', e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label>Terrain</label>
            <select
              className="inspector-select"
              defaultValue={feature.terrain}
              key={`terrain-${featureIndex}-${feature.terrain}`}
              onChange={(e) => handleFieldBlur('terrain', e.target.value)}
            >
              <option value="">(none)</option>
              {terrainKeys.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            GEOMETRY
          </h3>
          <div className="inspector-row">
            <label>At</label>
            <input
              type="text"
              className="inspector-input font-mono"
              defaultValue={feature.at}
              key={`at-${featureIndex}-${feature.at}`}
              onBlur={(e) => handleFieldBlur('at', e.target.value)}
            />
          </div>
          <div className="inspector-row">
            <label>Elevation</label>
            <input
              type="number"
              className="inspector-input"
              defaultValue={feature.elevation ?? ''}
              key={`elevation-${featureIndex}-${feature.elevation}`}
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
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            COORDINATE
          </h3>
          <div className="inspector-row">
            <label>Label</label>
            <span className="font-mono">{state.label}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            TERRAIN
          </h3>
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
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            CONTRIBUTING FEATURES
          </h3>
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
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            NEIGHBORS
          </h3>
          <div className="neighbor-grid">
            {state.neighborLabels.map((l) => (
              <span key={l} className="font-mono">
                {l}
              </span>
            ))}
          </div>
        </section>
        <div className="inspector-actions">
          <button
            className="btn-primary"
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
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            BOUNDARY
          </h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono text-xs">{boundaryId}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            TERRAIN
          </h3>
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
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            CONTRIBUTING FEATURES
          </h3>
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
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            ADJACENT HEXES
          </h3>
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
            className="btn-primary"
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
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            JUNCTION
          </h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono text-xs">{vertexId}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            TERRAIN
          </h3>
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
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            CONTRIBUTING FEATURES
          </h3>
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
        </section>
        <section className="inspector-section">
          <h3
            className="inspector-header"
            style={{ padding: '0 0 8px 0', marginBottom: '12px', fontSize: '10px' }}
          >
            MEETING HEXES
          </h3>
          <ul className="inspector-list">
            {meetingHexes.map((l) => (
              <li key={l} className="font-mono">
                {l}
              </li>
            ))}
          </ul>
        </section>
        <div className="inspector-actions">
          <button
            className="btn-primary"
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
