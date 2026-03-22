import React, { useState } from 'react';
import { Hex } from '@hexmap/core';
import './NewMapDialog.css';

interface NewMapDialogProps {
  onCreateMap: (yaml: string) => void;
  onCancel: () => void;
}

const TERRAIN_COLORS: Record<string, string> = {
  clear: '#d4c87a',
  forest: '#2d6a1e',
  rough: '#8b7355',
  urban: '#888888',
  water: '#4a8fc7',
  mountain: '#6b4226',
};

export const NewMapDialog: React.FC<NewMapDialogProps> = ({ onCreateMap, onCancel }) => {
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [orientation, setOrientation] = useState<'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left'>('flat-down');
  const [origin, setOrigin] = useState<'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'>('top-left');
  const [labelFormat, setLabelFormat] = useState<string>('XXYY');
  const [firstCol, setFirstCol] = useState(1);
  const [firstRow, setFirstRow] = useState(1);

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
    let startCol = 0, endCol = width - 1;
    let startRow = 0, endRow = height - 1;

    if (origin.includes('right')) {
      startCol = width - 1;
      endCol = 0;
    }

    if (origin.includes('bottom')) {
      startRow = height - 1;
      endRow = 0;
    }

    const labelHex = (col: number, row: number) =>
      Hex.formatHexLabel(
        Hex.offsetToCube(col, row, orientation),
        labelFormat,
        orientation,
        firstCol,
        firstRow,
      );

    const c1 = labelHex(startCol, startRow);
    const c2 = labelHex(endCol, startRow);
    const c3 = labelHex(endCol, endRow);
    const c4 = labelHex(startCol, endRow);

    const allPath = `${c1} - ${c2} - ${c3} - ${c4} fill`;

    let yaml = `hexmap: "1.0"\n`;
    yaml += `metadata:\n  title: "New Map"\n`;
    yaml += `layout:\n`;
    yaml += `  orientation: ${orientation}\n`;
    yaml += `  label: ${labelFormat}\n`;
    if (firstCol !== 1 || firstRow !== 1) {
      yaml += `  first: [${firstCol}, ${firstRow}]\n`;
    }
    yaml += `  all: "${allPath}"\n`;

    yaml += `terrain:\n  hex:\n`;
    if (selectedPalette.terrain.length > 0) {
      for (const t of selectedPalette.terrain) {
        yaml += `    ${t}: { style: { color: "${TERRAIN_COLORS[t] || '#cccccc'}" } }\n`;
      }
    } else {
      yaml += `    clear: { style: { color: "#ffffff" } }\n`;
    }

    if (baseTerrain !== 'none') {
      yaml += `features:\n`;
      yaml += `  - at: "@all"\n`;
      yaml += `    terrain: ${baseTerrain}\n`;
    } else {
      yaml += `features: []\n`;
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
            Label Format:
            <select value={labelFormat} onChange={e => setLabelFormat(e.target.value)}>
              <option value="XXYY">XXYY (0304)</option>
              <option value="XX.YY">XX.YY (03.04)</option>
              <option value="AYY">AYY (C04)</option>
            </select>
          </label>
        </div>

        <div className="dialog-row">
          <label>
            First Column:
            <input type="number" min="0" max="99" value={firstCol} onChange={e => setFirstCol(Number(e.target.value))} />
          </label>
          <label>
            First Row:
            <input type="number" min="0" max="99" value={firstRow} onChange={e => setFirstRow(Number(e.target.value))} />
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