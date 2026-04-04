import { type MapCommand, MapModel, type Selection } from '@hexmap/canvas';
import { Hex } from '@hexmap/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, test, vi } from 'vitest';
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
  test('renders placeholder when nothing selected', () => {
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={null} />);
    expect(screen.getByText(/No map loaded/i)).toBeDefined();
  });

  it('shows terrain types when nothing is selected', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // MOCK_YAML defines "clear" and "forest" terrain types
    expect(screen.getByText('clear')).toBeDefined();
    expect(screen.getByText('forest')).toBeDefined();
  });

  it('opens edit form when terrain grid cell is double-clicked', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // Double-click "forest" cell to open edit form
    const forestCell = screen.getByText('forest').closest('.terrain-grid-cell') as HTMLElement;
    expect(forestCell).not.toBeNull();
    fireEvent.doubleClick(forestCell);

    // Edit form should now be visible with Key input
    expect(screen.getByLabelText('Key')).toBeInTheDocument();
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
    const model = MapModel.load(METADATA_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    const orientationBtn = screen.getByTitle('pointy-right');
    fireEvent.click(orientationBtn);

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

    // Double-click "clear" to expand edit form
    fireEvent.doubleClick(screen.getByText('clear'));

    // Find the color input via ColorPicker
    const colorInput = screen.getByLabelText('Pick color');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });

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
    fireEvent.doubleClick(screen.getByText('clear'));

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

  it('shows Close and Delete terrain buttons inside expanded edit form', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // Double-click "forest" to expand edit form
    const forestCell = screen.getByText('forest').closest('.terrain-grid-cell') as HTMLElement;
    fireEvent.doubleClick(forestCell);

    expect(screen.getByText('Close')).toBeInTheDocument();
    expect(screen.getByText('Delete terrain')).toBeInTheDocument();
  });

  it('Close button collapses the edit form', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // Expand edit form
    fireEvent.doubleClick(screen.getByText('forest').closest('.terrain-grid-cell') as HTMLElement);
    expect(screen.getByLabelText('Key')).toBeInTheDocument();

    // Click Close
    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByLabelText('Key')).not.toBeInTheDocument();
  });

  it('terrain delete requires confirmation when terrain is in use', async () => {
    // MOCK_YAML: "forest" is used by 1 feature (index 1)
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Expand "forest" edit form
    const forestCell = screen.getByText('forest').closest('.terrain-grid-cell') as HTMLElement;
    fireEvent.doubleClick(forestCell);

    // Click Delete terrain
    fireEvent.click(screen.getByText('Delete terrain'));

    // confirm dialog should have been called with usage message
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining('"forest" is used by 1 feature')
    );
    // Since we returned false from confirm, no dispatch should have occurred
    expect(dispatched).toHaveLength(0);

    confirmSpy.mockRestore();
  });

  it('terrain delete proceeds when confirmed', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Expand "forest" edit form (forest is used by 1 feature)
    const forestCell = screen.getByText('forest').closest('.terrain-grid-cell') as HTMLElement;
    fireEvent.doubleClick(forestCell);

    // Click Delete terrain
    fireEvent.click(screen.getByText('Delete terrain'));

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ type: 'deleteTerrainType', geometry: 'hex', key: 'forest' });
    confirmSpy.mockRestore();
  });

  it('terrain delete without usage skips confirmation', () => {
    const unusedTerrainYaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    clear: { style: { color: "#ffffff" } }
    unused: { style: { color: "#888888" } }
features:
  - at: "@all"
    terrain: clear
`;
    const model = MapModel.load(unusedTerrainYaml);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];

    const confirmSpy = vi.spyOn(window, 'confirm');
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Expand "unused" edit form
    const unusedCell = screen.getByText('unused').closest('.terrain-grid-cell') as HTMLElement;
    fireEvent.doubleClick(unusedCell);

    // Click Delete terrain — should NOT show confirm because usage count is 0
    fireEvent.click(screen.getByText('Delete terrain'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]).toEqual({ type: 'deleteTerrainType', geometry: 'hex', key: 'unused' });
    confirmSpy.mockRestore();
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

    fireEvent.doubleClick(screen.getByText('clear'));

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
    render(<Inspector selection={sel} model={model} onPaintActivate={onPaintActivate} />);

    const clearChip = document.querySelector('.terrain-chip') as HTMLElement;
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

    const clearChip = document.querySelector('.terrain-chip.active') as HTMLElement;
    expect(clearChip).not.toBeNull();
    fireEvent.click(clearChip);

    expect(onPaintActivate).toHaveBeenCalledWith(null, 'hex');
  });

  it('applies paint-active class to active terrain grid cell', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} paintTerrainKey="clear" />);

    const activeCell = document.querySelector('.terrain-grid-cell.paint-active');
    expect(activeCell).not.toBeNull();
    expect(activeCell?.textContent).toContain('clear');
  });

  describe('multi-geometry terrain sections', () => {
    it('shows section headers for Hex, Edge, Vertex via tabs', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      render(<Inspector selection={sel} model={model} />);

      expect(screen.getByText('HEX TERRAIN')).toBeDefined();

      fireEvent.click(screen.getByText('edge'));
      expect(screen.getByText('EDGE TERRAIN')).toBeDefined();

      fireEvent.click(screen.getByText('vertex'));
      expect(screen.getByText('VERTEX TERRAIN')).toBeDefined();
    });

    it('shows edge terrain types under Edge section', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      render(<Inspector selection={sel} model={model} />);

      fireEvent.click(screen.getByText('edge'));
      expect(screen.getByText('river')).toBeDefined();
    });

    it('opens edit form for edge terrain when double-clicked', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      fireEvent.click(screen.getByText('edge'));
      const riverCell = screen.getByText('river').closest('.terrain-grid-cell') as HTMLElement;
      expect(riverCell).not.toBeNull();
      fireEvent.doubleClick(riverCell);

      // Edit form should appear
      expect(screen.getByLabelText('Key')).toBeInTheDocument();
    });

    it('dispatches add terrain with correct geometry for edge section', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const sel: Selection = { type: 'none' };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      fireEvent.click(screen.getByText('edge'));
      const addBtn = screen.getByText('+ Add Edge Terrain');
      fireEvent.click(addBtn);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].type).toBe('setTerrainType');
      expect(dispatched[0].type === 'setTerrainType' && dispatched[0].geometry).toBe('edge');
    });

    it('isPaintActive only highlights matching geometry (not same-name key in different section)', () => {
      const yaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    river: { style: { color: "#0000ff" } }
  edge:
    river: { style: { color: "#0044cc" } }
features:
  - at: "@all"
    terrain: clear
`;
      const model = MapModel.load(yaml);
      const sel: Selection = { type: 'none' };
      render(
        <Inspector selection={sel} model={model} paintTerrainKey="river" paintGeometry="edge" />
      );

      fireEvent.click(screen.getByText('edge'));

      const activeCells = document.querySelectorAll('.terrain-grid-cell.paint-active');
      expect(activeCells).toHaveLength(1);
    });

    it('edge view "Add Feature Here" dispatches addFeature with edge path', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const cube1 = Hex.offsetToCube(1, 1, 'flat-down');
      const cube2 = Hex.offsetToCube(2, 1, 'flat-down');
      const boundaryId = Hex.getCanonicalBoundaryId(cube1, cube2, 0);
      const sel: Selection = { type: 'edge', boundaryId, hexLabels: ['0101', '0201'] };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      const addBtn = screen.getByText('+ Add Feature Here');
      fireEvent.click(addBtn);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].type).toBe('addFeature');
      if (dispatched[0].type === 'addFeature') {
        expect(dispatched[0].feature.at).toMatch(/\d{4}\/[A-Z]+/);
      }
    });

    it('vertex view "Add Feature Here" dispatches addFeature with vertex path', () => {
      const model = MapModel.load(MULTI_GEOM_YAML);
      const h1 = Hex.offsetToCube(1, 1, 'flat-down');
      const h2 = Hex.hexNeighbor(h1, 0);
      const h3 = Hex.hexNeighbor(h1, 1);
      const vertexId = [Hex.hexId(h1), Hex.hexId(h2), Hex.hexId(h3)].join('^');
      const sel: Selection = { type: 'vertex', vertexId };
      const dispatched: MapCommand[] = [];
      render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

      const addBtn = screen.getByText('+ Add Feature Here');
      fireEvent.click(addBtn);

      expect(dispatched).toHaveLength(1);
      expect(dispatched[0].type).toBe('addFeature');
      if (dispatched[0].type === 'addFeature') {
        expect(dispatched[0].feature.at).toMatch(/\d{4}\.\d/);
      }
    });

  it('at field renders as a textarea', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    render(<Inspector selection={sel} model={model} />);

    // The at field should be a textarea, not an input
    const textarea = document.querySelector('textarea.inspector-at-textarea');
    expect(textarea).not.toBeNull();
    expect((textarea as HTMLTextAreaElement).value).toBe('0201');
  });

  it('at field textarea dispatches updateFeature on blur', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'feature', indices: [1] };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    const textarea = document.querySelector('textarea.inspector-at-textarea') as HTMLTextAreaElement;
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea, { target: { value: '0101' } });
    fireEvent.blur(textarea);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('updateFeature');
    if (dispatched[0].type === 'updateFeature') {
      expect(dispatched[0].changes.at).toBe('0101');
    }
  });

    it('hex color text input dispatches setTerrainType on blur with valid hex color', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Double-click "clear" to expand edit form
    fireEvent.doubleClick(screen.getByText('clear').closest('.terrain-grid-cell') as HTMLElement);

    // Find the hex color text input (distinguished by inspector-hex-input class)
    const hexInput = document.querySelector('.inspector-hex-input') as HTMLInputElement;
    expect(hexInput).not.toBeNull();

    fireEvent.change(hexInput, { target: { value: '#ff0000' } });
    fireEvent.blur(hexInput);

    const setCmd = dispatched.find((c) => c.type === 'setTerrainType');
    expect(setCmd).toBeDefined();
    if (setCmd?.type === 'setTerrainType') {
      expect(setCmd.key).toBe('clear');
      expect(setCmd.def.style?.color).toBe('#ff0000');
    }
  });

  it('hex color text input does not dispatch for invalid color strings', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    fireEvent.doubleClick(screen.getByText('clear').closest('.terrain-grid-cell') as HTMLElement);

    const hexInput = document.querySelector('.inspector-hex-input') as HTMLInputElement;
    expect(hexInput).not.toBeNull();

    fireEvent.change(hexInput, { target: { value: 'not-a-color' } });
    fireEvent.blur(hexInput);

    expect(dispatched.filter((c) => c.type === 'setTerrainType')).toHaveLength(0);
  });

  it('path checkbox dispatches setTerrainType with path property set', () => {
    const model = MapModel.load(MOCK_YAML);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    // Expand "clear" hex terrain
    fireEvent.doubleClick(screen.getByText('clear').closest('.terrain-grid-cell') as HTMLElement);

    const pathCheckbox = screen.getByLabelText('Path') as HTMLInputElement;
    expect(pathCheckbox).not.toBeNull();
    expect(pathCheckbox.checked).toBe(false);

    fireEvent.click(pathCheckbox);

    const setCmd = dispatched.find((c) => c.type === 'setTerrainType');
    expect(setCmd).toBeDefined();
    if (setCmd?.type === 'setTerrainType') {
      expect(setCmd.key).toBe('clear');
      expect(setCmd.def.properties?.path).toBe(true);
    }
  });

  it('path checkbox unchecking removes path property', () => {
    const pathTerrainYaml = `
hexmap: "1.0"
layout:
  orientation: flat-down
  all: "0101 0201"
terrain:
  hex:
    road: { style: { color: "#ffcc00" }, properties: { path: true } }
features:
  - at: "@all"
    terrain: road
`;
    const model = MapModel.load(pathTerrainYaml);
    const sel: Selection = { type: 'none' };
    const dispatched: MapCommand[] = [];
    render(<Inspector selection={sel} model={model} dispatch={(cmd) => dispatched.push(cmd)} />);

    fireEvent.doubleClick(screen.getByText('road').closest('.terrain-grid-cell') as HTMLElement);

    const pathCheckbox = screen.getByLabelText('Path') as HTMLInputElement;
    expect(pathCheckbox.checked).toBe(true);

    fireEvent.click(pathCheckbox);

    const setCmd = dispatched.find((c) => c.type === 'setTerrainType');
    expect(setCmd).toBeDefined();
    if (setCmd?.type === 'setTerrainType') {
      expect(setCmd.def.properties).toBeUndefined();
    }
  });

  it('path checkbox is not shown for edge terrain', () => {
    const model = MapModel.load(MULTI_GEOM_YAML);
    const sel: Selection = { type: 'none' };
    render(<Inspector selection={sel} model={model} />);

    // Switch to edge tab and expand river
    fireEvent.click(screen.getByText('edge'));
    fireEvent.doubleClick(screen.getByText('river').closest('.terrain-grid-cell') as HTMLElement);

    expect(screen.queryByLabelText('Path')).toBeNull();
  });

  it('activates paint with geometry when edge terrain grid cell is clicked', () => {
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

      fireEvent.click(screen.getByText('edge'));
      const riverCell = screen.getByText('river').closest('.terrain-grid-cell') as HTMLElement;
      fireEvent.click(riverCell);

      expect(paintKey).toBe('river');
      expect(paintGeometry).toBe('edge');
    });
  });
});
