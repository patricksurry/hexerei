import { Hex } from '@hexmap/core';
import type React from 'react';
import { useState } from 'react';
import { OrientationPicker } from './OrientationPicker';
import { OriginPicker } from './OriginPicker';
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
  river: '#0044cc',
  cliff: '#663300',
  road: '#996633',
};

const PALETTES: Record<
  string,
  { label: string; terrain: string[]; edgeTerrain?: string[]; pathTerrain?: string[] }
> = {
  standard: {
    label: 'Standard Wargame',
    terrain: ['clear', 'forest', 'rough', 'urban', 'water', 'mountain'],
    edgeTerrain: ['river', 'cliff'],
    pathTerrain: ['road'],
  },
  blank: {
    label: 'Blank',
    terrain: [],
  },
};

export const NewMapDialog: React.FC<NewMapDialogProps> = ({ onCreateMap, onCancel }) => {
  const [title, setTitle] = useState('');
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [orientation, setOrientation] = useState<
    'flat-down' | 'flat-up' | 'pointy-right' | 'pointy-left'
  >('flat-down');
  const [origin, setOrigin] = useState<'top-left' | 'bottom-left' | 'top-right' | 'bottom-right'>(
    'top-left'
  );
  const [labelFormat, setLabelFormat] = useState<string>('XXYY');
  const [firstCol, setFirstCol] = useState(1);
  const [firstRow, setFirstRow] = useState(1);
  const [paletteId, setPaletteId] = useState('standard');
  const [baseTerrain, setBaseTerrain] = useState('clear');

  const handlePaletteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setPaletteId(id);
    const p = PALETTES[id];
    if (p.terrain.length > 0) {
      setBaseTerrain(p.terrain[0]);
    } else {
      setBaseTerrain('none');
    }
  };

  const handleCreate = () => {
    // Basic rectangle generation logic
    const startCol = firstCol;
    const startRow = firstRow;
    const endCol = firstCol + width - 1;
    const endRow = firstRow + height - 1;

    const labelHex = (col: number, row: number) => {
      const cube = Hex.offsetToCube(col - firstCol, row - firstRow, orientation);
      return Hex.formatHexLabel(cube, labelFormat, orientation, firstCol, firstRow);
    };

    const c1 = labelHex(startCol, startRow);
    const c2 = labelHex(endCol, startRow);
    const c3 = labelHex(endCol, endRow);
    const c4 = labelHex(startCol, endRow);

    const allPath = `${c1} - ${c2} - ${c3} - ${c4} fill`;

    let yaml = `hexmap: "1.0"\n`;
    yaml += `metadata:\n  title: "${title}"\n`;
    yaml += `layout:\n`;
    yaml += `  orientation: ${orientation}\n`;
    yaml += `  label: ${labelFormat}\n`;
    if (firstCol !== 1 || firstRow !== 1) {
      yaml += `  first: [${firstCol}, ${firstRow}]\n`;
    }
    yaml += `  origin: ${origin}\n`;
    yaml += `  all: "${allPath}"\n`;
    yaml += `terrain:\n`;
    yaml += `  hex:\n`;

    const selectedPalette = PALETTES[paletteId];
    if (selectedPalette.terrain.length > 0) {
      for (const t of selectedPalette.terrain) {
        yaml += `    ${t}: { style: { color: "${TERRAIN_COLORS[t] || '#cccccc'}" } }\n`;
      }
    } else {
      yaml += `    clear: { style: { color: "#f5f0e8" } }\n`;
    }

    // Path terrain goes under terrain.hex with path: true property
    if (selectedPalette.pathTerrain?.length) {
      for (const t of selectedPalette.pathTerrain) {
        yaml += `    ${t}: { style: { color: "${TERRAIN_COLORS[t] || '#cccccc'}" }, properties: { path: true } }\n`;
      }
    }

    // Edge terrain is a separate section under terrain
    if (selectedPalette.edgeTerrain?.length) {
      yaml += `  edge:\n`;
      for (const t of selectedPalette.edgeTerrain) {
        yaml += `    ${t}: { style: { color: "${TERRAIN_COLORS[t] || '#cccccc'}" } }\n`;
      }
    }

    yaml += `features:\n`;
    if (baseTerrain !== 'none') {
      yaml += `  - at: "@all"\n`;
      yaml += `    terrain: ${baseTerrain}\n`;
    }

    onCreateMap(yaml);
  };

  const selectedPalette = PALETTES[paletteId];

  return (
    <div
      className="new-map-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-map-title"
    >
      <div className="new-map-dialog">
        <h2 id="new-map-title">Create New Map</h2>

        <div className="dialog-row">
          <label>
            Title:
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter map name..."
            />
          </label>
        </div>

        <div className="dialog-section">
          <h3 className="dialog-section-title">Grid</h3>
          <div className="dialog-row">
            <label>
              Width:
              <input
                type="number"
                min="1"
                max="100"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
              />
            </label>
            <label>
              Height:
              <input
                type="number"
                min="1"
                max="100"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="dialog-row">
            <label>
              Orientation:
              <OrientationPicker
                value={orientation as any}
                onChange={(val) => setOrientation(val)}
              />
            </label>
          </div>

          <div className="dialog-row">
            <label>
              Origin:
              <OriginPicker value={origin as any} onChange={(val) => setOrigin(val)} />
            </label>
          </div>

          <div className="dialog-row">
            <label>
              Label Format:
              <select value={labelFormat} onChange={(e) => setLabelFormat(e.target.value)}>
                <option value="XXYY">XXYY (0304)</option>
                <option value="XX.YY">XX.YY (03.04)</option>
                <option value="AYY">AYY (C04)</option>
              </select>
            </label>
          </div>

          <div className="dialog-row">
            <label>
              First Column:
              <input
                type="number"
                min="0"
                max="99"
                value={firstCol}
                onChange={(e) => setFirstCol(Number(e.target.value))}
              />
            </label>
            <label>
              First Row:
              <input
                type="number"
                min="0"
                max="99"
                value={firstRow}
                onChange={(e) => setFirstRow(Number(e.target.value))}
              />
            </label>
          </div>
        </div>

        <div className="dialog-section">
          <h3 className="dialog-section-title">Terrain</h3>
          <div className="dialog-row">
            <label>
              Terrain Palette:
              <select value={paletteId} onChange={handlePaletteChange}>
                {Object.entries(PALETTES).map(([id, p]) => (
                  <option key={id} value={id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="dialog-row">
            <label>
              Base Terrain:
              <select value={baseTerrain} onChange={(e) => setBaseTerrain(e.target.value)}>
                <option value="none">None</option>
                {selectedPalette.terrain.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleCreate} disabled={!title.trim()}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
