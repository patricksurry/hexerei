import React from 'react';
import './CanvasPlaceholder.css';

export function CanvasPlaceholder() {
  return (
    <div className="canvas-placeholder">
      <div className="canvas-hint">
        <div className="canvas-icon">⬢</div>
        <div className="canvas-text">Canvas — Phase 2</div>
        <div className="canvas-subtext">Renderer integration pending</div>
      </div>
    </div>
  );
}
