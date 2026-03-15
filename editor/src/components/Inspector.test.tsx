import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Inspector } from './Inspector';
import { Selection, MapModel, MapCommand } from '@hexmap/canvas';

const MOCK_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
features:
  - at: "@all"
    terrain: clear
  - at: "0201"
    terrain: forest
    label: "Target"
`;

describe('Inspector', () => {
  it('renders placeholder when nothing selected', () => {
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={null} />);
    expect(screen.getByText(/Loading/i)).toBeDefined();
  });

  it('renders editable form when feature is selected', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    render(<Inspector selection={sel} model={model} />);
    const labelInput = screen.getByDisplayValue('Target');
    expect(labelInput).toBeDefined();
  });

  it('dispatches updateFeature when label is changed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
    
    const labelInput = screen.getByDisplayValue('Target');
    fireEvent.change(labelInput, { target: { value: 'Dark Forest' } });
    fireEvent.blur(labelInput);
    
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('updateFeature');
    if (dispatched[0].type === 'updateFeature') {
      expect(dispatched[0].changes.label).toBe('Dark Forest');
    }
  });

  it('dispatches deleteFeature when delete button is clicked', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
    
    const deleteBtn = screen.getByText('Delete');
    fireEvent.click(deleteBtn);
    
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('deleteFeature');
  });
});

  it('hex view shows "Add Feature Here" button that dispatches addFeature', () => {
    const model = MapModel.load(MOCK_YAML);
    const hexId = '1,1,-2'; // 0101
    const sel: Selection = { type: 'hex', hexId, label: '0101' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);
    
    const addBtn = screen.getByText('+ Add Feature Here');
    fireEvent.click(addBtn);
    
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('addFeature');
    if (dispatched[0].type === 'addFeature') {
      expect(dispatched[0].feature.at).toBe('0101');
    }
  });
