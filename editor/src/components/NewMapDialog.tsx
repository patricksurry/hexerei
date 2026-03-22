import React, { useState } from 'react';
import './NewMapDialog.css';

interface NewMapDialogProps {
  onCreateMap: (yaml: string) => void;
  onCancel: () => void;
}

export const NewMapDialog: React.FC<NewMapDialogProps> = ({ onCreateMap, onCancel }) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [orientation, setOrientation] = useState<'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left'>('flat-down');
  const [origin, setOrigin] = useState<'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'>('top-left');
  
  const PALETTES: Record<string, { label: string; terrain: string[] }> = {
    'standard': {
      label: 'Standard Wargame',
      terrain: ['clear', 'forest', 'rough', 'urban', 'water', 'mountain']
    },
    'blank': {
      label: 'Blank',
      terrain: []
    }
  };
  
  const [paletteId, setPaletteId] = useState('standard');
  const [baseTerrain, setBaseTerrain] = useState<string>('clear');

  const selectedPalette = PALETTES[paletteId];

  const handlePaletteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPaletteId = e.target.value;
    setPaletteId(newPaletteId);
    
    // Reset base terrain if it's not in the new palette
    const newPalette = PALETTES[newPaletteId];
    if (newPalette.terrain.length > 0) {
      if (!newPalette.terrain.includes(baseTerrain) && baseTerrain !== 'none') {
        setBaseTerrain(newPalette.terrain[0]);
      }
    } else {
      setBaseTerrain('none');
    }
  };

  const handleCreate = () => {
    // Determine the corner hexes based on origin and dimensions
    // Hex map usually uses 1-based indexing for labels if label format is XXYY.
    // Let's assume standard XXYY format for labels where XX is col, YY is row.
    // X goes from 1 to width, Y goes from 1 to height.
    let startX = 1, endX = width;
    let startY = 1, endY = height;
    
    if (origin.includes('right')) {
      startX = width;
      endX = 1;
    }
    
    if (origin.includes('bottom')) {
      startY = height;
      endY = 1;
    }

    const formatHex = (x: number, y: number) => {
      // Very basic formatting for XXYY
      const xx = Math.abs(x).toString().padStart(2, '0');
      const yy = Math.abs(y).toString().padStart(2, '0');
      return `${xx}${yy}`;
    };

    const c1 = formatHex(startX, startY);
    const c2 = formatHex(endX, startY);
    const c3 = formatHex(endX, endY);
    const c4 = formatHex(startX, endY);

    const allPath = `${c1} - ${c2} - ${c3} - ${c4} fill`;

    let yaml = `hexmap: "1.0"\n`;
    yaml += `metadata:\n  title: "New Map"\n`;
    yaml += `layout:\n`;
    yaml += `  orientation: ${orientation}\n`;
    yaml += `  label: XXYY\n`;
    yaml += `  all: "${allPath}"\n`;
    
    yaml += `terrain:\n  hex:\n`;
    if (selectedPalette.terrain.length > 0) {
      for (const t of selectedPalette.terrain) {
        yaml += `    ${t}: { style: { color: "#cccccc" } }\n`; // Placeholder styles
      }
    } else {
      yaml += `    clear: { style: { color: "#ffffff" } }\n`;
    }

    yaml += `features:\n`;
    if (baseTerrain !== 'none') {
      yaml += `  - at: "@all"\n`;
      yaml += `    terrain: ${baseTerrain}\n`;
    } else {
      yaml += `  []\n`;
    }

    onCreateMap(yaml);
  };

  return (
    <div className="new-map-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="new-map-title">
      <div className="new-map-dialog">
        <h2 id="new-map-title">Create New Map</h2>
        
        <div className="dialog-row">
          <label>
            Width:
            <input type="number" min="1" max="100" value={width} onChange={e => setWidth(Number(e.target.value))} />
          </label>
          <label>
            Height:
            <input type="number" min="1" max="100" value={height} onChange={e => setHeight(Number(e.target.value))} />
          </label>
        </div>

        <div className="dialog-row">
          <label>
            Orientation:
            <select value={orientation} onChange={e => setOrientation(e.target.value as any)}>
              <option value="flat-down">Flat-topped (Rows)</option>
              <option value="flat-up">Flat-topped (Rows, alternate)</option>
              <option value="pointy-right">Pointy-topped (Columns)</option>
              <option value="pointy-left">Pointy-topped (Columns, alternate)</option>
            </select>
          </label>
        </div>

        <div className="dialog-row">
          <label>
            Origin:
            <select value={origin} onChange={e => setOrigin(e.target.value as any)}>
              <option value="top-left">Top-Left</option>
              <option value="bottom-left">Bottom-Left</option>
              <option value="top-right">Top-Right</option>
              <option value="bottom-right">Bottom-Right</option>
            </select>
          </label>
        </div>

        <div className="dialog-row">
          <label>
            Starter Palette:
            <select value={paletteId} onChange={handlePaletteChange}>
              {Object.entries(PALETTES).map(([id, p]) => (
                <option key={id} value={id}>{p.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="dialog-row">
          <label>
            Base Terrain:
            <select value={baseTerrain} onChange={e => setBaseTerrain(e.target.value)}>
              <option value="none">None</option>
              {selectedPalette.terrain.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
};