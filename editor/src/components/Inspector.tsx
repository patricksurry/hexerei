import React from 'react';
import { FeatureItem, Selection } from '../types';
import './Inspector.css';

interface InspectorProps {
  selection: Selection;
  features?: FeatureItem[];
  mapTitle?: string;
  mapLayout?: { hex_top: string; stagger: string; label: string };
}

export function Inspector({
  selection,
  features = [],
  mapTitle = 'Untitled Map',
  mapLayout = { hex_top: 'flat', stagger: 'even', label: 'offset' },
}: InspectorProps) {
  const renderMetadata = () => (
    <div className="inspector-content">
      <section className="inspector-section">
        <h3 className="inspector-heading">MAP METADATA</h3>
        <div className="inspector-row">
          <label>Title</label>
          <span>{mapTitle}</span>
        </div>
      </section>
      <section className="inspector-section">
        <h3 className="inspector-heading">LAYOUT</h3>
        <div className="inspector-row">
          <label>Hex Top</label>
          <span>{mapLayout.hex_top}</span>
        </div>
        <div className="inspector-row">
          <label>Stagger</label>
          <span>{mapLayout.stagger}</span>
        </div>
        <div className="inspector-row">
          <label>Label</label>
          <span>{mapLayout.label}</span>
        </div>
      </section>
      <section className="inspector-section">
        <h3 className="inspector-heading">VOCABULARY</h3>
        <p className="placeholder-text">Terrain vocabulary placeholder (Phase 5)</p>
      </section>
    </div>
  );

  const renderFeature = (indices: number[]) => {
    const feature = features.find((f) => indices.includes(f.index));
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

  return (
    <div className="inspector">
      <div className="inspector-header">
        INSPECTOR
      </div>
      {selection.type === 'none' && renderMetadata()}
      {selection.type === 'feature' && renderFeature(selection.indices)}
      {selection.type === 'hex' && (
        <div className="inspector-content">
          <h3 className="inspector-heading">HEX: {selection.id}</h3>
          <p className="placeholder-text">Hex inspection (Phase 3)</p>
        </div>
      )}
      {(selection.type === 'edge' || selection.type === 'vertex') && (
        <div className="inspector-content">
          <h3 className="inspector-heading">{selection.type.toUpperCase()}: {selection.id}</h3>
          <p className="placeholder-text">Geometry inspection (Phase 3)</p>
        </div>
      )}
    </div>
  );
}
