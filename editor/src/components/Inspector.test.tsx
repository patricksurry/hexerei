import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { Selection, MapModel, MapCommand } from '@hexmap/canvas';
import { Inspector } from './Inspector';

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

const METADATA_YAML = `
hexmap: "1.0"
metadata:
  title: "Test Map"
  designer: "Test Designer"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
features:
  - at: "@all"
    terrain: clear
`;

const MULTI_GEOM_YAML = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    forest: { style: { color: "#00ff00" } }
  edge:
    river: { style: { color: "#0044cc" } }
  vertex:
    bridge: { style: { color: "#888888" } }
features:
  - at: "@all"
    terrain: clear
`;

describe('Inspector', () => {
  it('renders placeholder when nothing selected', () => {
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={null} />);
    expect(screen.getByText(/Loading/i)).toBeDefined();
  });

  it('shows terrain types when nothing is selected', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // MOCK_YAML defines "clear" and "forest" terrain types
    expect(screen.getByText('clear')).toBeDefined();
    expect(screen.getByText('forest')).toBeDefined();
  });

  it('dispatches deleteTerrainType when delete button is clicked', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Find the delete button next to "forest"
    const forestRow = screen.getByText('forest').closest('.terrain-row');
    expect(forestRow).not.toBeNull();
    const deleteBtn = within(forestRow as HTMLElement).getByRole('button', {
      name: /delete terrain/i,
    });
    fireEvent.click(deleteBtn);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({
      type: 'deleteTerrainType',
      geometry: 'hex',
      key: 'forest',
    });
  });

  it('dispatches setMetadata when title is changed', () => {
    const model = MapModel.load(METADATA_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    const titleInput = screen.getByDisplayValue('Test Map');
    fireEvent.change(titleInput, { target: { value: 'New Title' } });
    fireEvent.blur(titleInput);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ type: 'setMetadata', key: 'title', value: 'New Title' });
  });

  it('dispatches setLayout when orientation is changed', () => {
    const model = MapModel.load(METADATA_YAML); // Note: METADATA_YAML was added to the test file in Task 1
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    const orientationSelect = screen.getByDisplayValue('flat-down');
    fireEvent.change(orientationSelect, { target: { value: 'pointy-right' } });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ type: 'setLayout', key: 'orientation', value: 'pointy-right' });
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

  it('dispatches setTerrainType when terrain color is changed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Click "clear" to expand
    fireEvent.click(screen.getByText('clear'));

    // Find the color input (type="color")
    const colorInput = screen.getByLabelText('Terrain color');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    fireEvent.blur(colorInput);

    expect(dispatched.length).toBeGreaterThanOrEqual(1);
    const setCmd = dispatched.find((c) => c.type === 'setTerrainType');
    expect(setCmd).toBeDefined();
    if (setCmd?.type === 'setTerrainType') {
      expect(setCmd.key).toBe('clear');
      expect(setCmd.def.style?.color).toBe('#ff0000');
    }
  });

  it('dispatches deleteTerrainType and setTerrainType when key is changed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Click "clear" to expand
    fireEvent.click(screen.getByText('clear'));

    const keyInput = screen.getByLabelText('Key');
    fireEvent.change(keyInput, { target: { value: 'clear_new' } });
    fireEvent.blur(keyInput);

    expect(dispatched).toHaveLength(2);
    expect(dispatched[0]).toEqual({
      type: 'deleteTerrainType',
      geometry: 'hex',
      key: 'clear',
    });
    expect(dispatched[1]).toEqual({
      type: 'setTerrainType',
      geometry: 'hex',
      key: 'clear_new',
      def: expect.objectContaining({ style: { color: '#ffffff' } }),
    });
  });

  it('dispatches setLayout when label format dropdown changes', () => {
    const model = MapModel.load(METADATA_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    const labelSelect = screen.getByDisplayValue('XXYY');
    fireEvent.change(labelSelect, { target: { value: 'XX.YY' } });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ type: 'setLayout', key: 'label', value: 'XX.YY' });
  });

  it('dispatches setTerrainType when type is changed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    fireEvent.click(screen.getByText('clear'));

    const typeSelect = screen.getByLabelText('Type');
    fireEvent.change(typeSelect, { target: { value: 'modifier' } });

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({
      type: 'setTerrainType',
      geometry: 'hex',
      key: 'clear',
      def: expect.objectContaining({ type: 'modifier' }),
    });
  });

  it('calls onPaintActivate when terrain color chip is clicked', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const onPaintActivate = vi.fn();
    render(
      <Inspector
        selection={sel}
        model={model}
        onPaintActivate={onPaintActivate}
      />
    );

    const clearChip = document.querySelector('.terrain-color-chip') as HTMLElement;
    expect(clearChip).not.toBeNull();
    fireEvent.click(clearChip);

    expect(onPaintActivate).toHaveBeenCalledWith('clear', 'hex');
  });

  it('calls onPaintActivate(null) when active terrain chip is clicked again', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const onPaintActivate = vi.fn();
    render(
      <Inspector
        selection={sel}
        model={model}
        paintTerrainKey="clear"
        onPaintActivate={onPaintActivate}
      />
    );

    const clearChip = document.querySelector('.terrain-color-chip.active') as HTMLElement;
    expect(clearChip).not.toBeNull();
    fireEvent.click(clearChip);

    expect(onPaintActivate).toHaveBeenCalledWith(null, 'hex');
  });

  it('applies paint-active class to active terrain row', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(
      <Inspector
        selection={sel}
        model={model}
        paintTerrainKey="clear"
      />
    );

    const activeRow = document.querySelector('.terrain-row.paint-active');
    expect(activeRow).not.toBeNull();
    expect(activeRow!.textContent).toContain('clear');
  });

  describe('multi-geometry terrain sections', () => {
    it('shows section headers for Hex, Edge, Vertex', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      render(<Inspector selection={sel} model={model} />);

      expect(screen.getByText('HEX TERRAIN')).toBeDefined();
      expect(screen.getByText('EDGE TERRAIN')).toBeDefined();
      expect(screen.getByText('VERTEX TERRAIN')).toBeDefined();
    });

    it('shows edge terrain types under Edge section', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      render(<Inspector selection={sel} model={model} />);
      expect(screen.getByText('river')).toBeDefined();
    });

    it('dispatches deleteTerrainType with correct geometry for edge terrain', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      const riverRow = screen.getByText('river').closest('.terrain-row');
      const deleteBtn = within(riverRow as HTMLElement).getByRole('button', { name: /delete terrain/i });
      fireEvent.click(deleteBtn);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0]).toEqual({
        type: 'deleteTerrainType',
        geometry: 'edge',
        key: 'river',
      });
    });

    it('dispatches add terrain with correct geometry for edge section', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      // Find the "+ Add Edge Terrain" button
      const addBtn = screen.getByText('+ Add Edge Terrain');
      fireEvent.click(addBtn);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].type).toBe('setTerrainType');
      // @ts-ignore
      expect(dispatched[0].geometry).toBe('edge');
    });

    it('activates paint with geometry when edge terrain chip is clicked', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      let paintKey: string | null = null;
      let paintGeometry: string | null = null;
      render(
        <Inspector
          selection={sel}
          model={model}
          onPaintActivate={(key, geometry) => {
            paintKey = key;
            paintGeometry = (geometry as any) ?? null;
          }}
        />
      );

      const riverRow = screen.getByText('river').closest('.terrain-row');
      const chip = (riverRow as HTMLElement).querySelector('.terrain-color-chip');
      fireEvent.click(chip!);

      expect(paintKey).toBe('river');
      expect(paintGeometry).toBe('edge');
    });
  });
});
