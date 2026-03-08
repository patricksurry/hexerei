import { Selection } from '../types';
import { MapModel } from '../model/map-model';
import './Inspector.css';

interface InspectorProps {
  selection: Selection;
  model: MapModel | null;
  onSelectFeature?: (index: number) => void;
}

export function Inspector({
  selection,
  model,
  onSelectFeature,
}: InspectorProps) {
  if (!model) return <div className="inspector"><div className="inspector-content">Loading...</div></div>;
  const renderMetadata = () => (
    <div className="inspector-content">
      <section className="inspector-section">
        <h3 className="inspector-heading">MAP METADATA</h3>
        <div className="inspector-row">
          <label>Title</label>
          <span>{model.metadata.title || 'Untitled Map'}</span>
        </div>
      </section>
      <section className="inspector-section">
        <h3 className="inspector-heading">LAYOUT</h3>
        <div className="inspector-row">
          <label>Orientation</label>
          <span>{model.grid.orientation}</span>
        </div>
        <div className="inspector-row">
          <label>Label</label>
          <span>{model.grid.labelFormat}</span>
        </div>
      </section>
      <section className="inspector-section">
        <h3 className="inspector-heading">VOCABULARY</h3>
        <p className="placeholder-text">Terrain vocabulary placeholder (Phase 5)</p>
      </section>
    </div>
  );

  const renderFeature = (indices: number[]) => {
    const feature = model.features.find((f) => indices.includes(f.index));
    if (!feature) return <div className="inspector-content">Feature not found</div>;

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-heading">FEATURE PROPERTIES</h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono">{feature.id || '-'}</span>
          </div>
          <div className="inspector-row">
            <label>Label</label>
            <span>{feature.label || '-'}</span>
          </div>
          <div className="inspector-row">
            <label>Terrain</label>
            <span>{feature.terrain || '-'}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-heading">GEOMETRY</h3>
          <div className="inspector-row">
            <label>At</label>
            <span className="font-mono">{feature.at}</span>
          </div>
        </section>
      </div>
    );
  };

  const renderHex = (hexId: string) => {
    const state = model.computedHex(hexId);
    if (!state) return <div className="inspector-content">Hex {hexId} not found in mesh.</div>;

    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-heading">COORDINATE</h3>
          <div className="inspector-row">
            <label>Label</label>
            <span className="font-mono">{state.label}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-heading">TERRAIN</h3>
          <div className="inspector-row">
            <label>Name</label>
            <span>{state.terrain}</span>
          </div>
          <div className="inspector-row">
            <label>Color</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', background: state.terrainColor, border: '1px solid #444' }} />
              <span className="font-mono">{state.terrainColor}</span>
            </div>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-heading">CONTRIBUTING FEATURES</h3>
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
          <h3 className="inspector-heading">NEIGHBORS</h3>
          <div className="neighbor-grid">
            {state.neighborLabels.map((l) => (
              <span key={l} className="font-mono">{l}</span>
            ))}
          </div>
        </section>
      </div>
    );
  };

  const renderEdge = (boundaryId: string, hexLabels: [string, string | null]) => (
    <div className="inspector-content">
      <section className="inspector-section">
        <h3 className="inspector-heading">BOUNDARY</h3>
        <div className="inspector-row">
          <label>ID</label>
          <span className="font-mono text-xs">{boundaryId}</span>
        </div>
      </section>
      <section className="inspector-section">
        <h3 className="inspector-heading">ADJACENT HEXES</h3>
        <div className="inspector-row">
          <label>Hex A</label>
          <span className="font-mono">{hexLabels[0]}</span>
        </div>
        <div className="inspector-row">
          <label>Hex B</label>
          <span className="font-mono">{hexLabels[1] || 'VOID'}</span>
        </div>
      </section>
    </div>
  );

  const renderVertex = (vertexId: string) => {
    const meetingHexes = vertexId.split('^').map(id => model.hexIdToLabel(id));
    return (
      <div className="inspector-content">
        <section className="inspector-section">
          <h3 className="inspector-heading">JUNCTION</h3>
          <div className="inspector-row">
            <label>ID</label>
            <span className="font-mono text-xs">{vertexId}</span>
          </div>
        </section>
        <section className="inspector-section">
          <h3 className="inspector-heading">MEETING HEXES</h3>
          <ul className="inspector-list">
            {meetingHexes.map((l) => (
              <li key={l} className="font-mono">{l}</li>
            ))}
          </ul>
        </section>
      </div>
    );
  };

  return (
    <div className="inspector">
      <div className="inspector-header">
        INSPECTOR
      </div>
      {selection.type === 'none' && renderMetadata()}
      {selection.type === 'feature' && renderFeature(selection.indices)}
      {selection.type === 'hex' && renderHex(selection.hexId)}
      {selection.type === 'edge' && renderEdge(selection.boundaryId, selection.hexLabels)}
      {selection.type === 'vertex' && renderVertex(selection.vertexId)}
    </div>
  );
}
