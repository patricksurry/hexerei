import type { TerrainDef } from '@hexmap/canvas';
import { useEffect, useRef, useState } from 'react';
import { TerrainChip } from './TerrainChip';
import './TerrainSelect.css';

interface TerrainSelectProps {
  value: string;
  terrainDefs: Map<string, TerrainDef>;
  geometry: 'hex' | 'edge' | 'vertex';
  orientation?: string;
  onChange: (key: string) => void;
}

export const TerrainSelect = ({ value, terrainDefs, geometry, orientation, onChange }: TerrainSelectProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const currentDef = terrainDefs.get(value);

  return (
    <div className="terrain-select" ref={ref}>
      <button className="terrain-select-trigger" onClick={() => setOpen(!open)} type="button">
        {currentDef ? (
          <>
            <TerrainChip color={currentDef.color} geometry={geometry} orientation={orientation} />
            <span className="terrain-select-label">{value}</span>
          </>
        ) : (
          <span className="terrain-select-label terrain-select-none">(none)</span>
        )}
        <span className="terrain-select-arrow">&#9662;</span>
      </button>
      {open && (
        <ul className="terrain-select-dropdown">
          <li
            className={`terrain-select-option ${!value ? 'selected' : ''}`}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
          >
            <span className="terrain-select-label terrain-select-none">(none)</span>
          </li>
          {Array.from(terrainDefs.entries()).map(([key, def]) => (
            <li
              key={key}
              className={`terrain-select-option ${key === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
            >
              <TerrainChip color={def.color} geometry={geometry} orientation={orientation} />
              <span className="terrain-select-label">{key}</span>
              {def.name !== key && <span className="terrain-select-name">{def.name}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
