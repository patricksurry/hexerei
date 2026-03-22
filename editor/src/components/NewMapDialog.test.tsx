import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewMapDialog } from './NewMapDialog';

describe('NewMapDialog', () => {
  it('generates standard YAML on create', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);
    
    // Default is 10x10, flat-down, top-left, standard palette, clear base terrain
    fireEvent.click(screen.getByText('Create'));
    
    expect(onCreateMap).toHaveBeenCalled();
    const yaml = onCreateMap.mock.calls[0][0];
    
    expect(yaml).toContain('orientation: flat-down');
    expect(yaml).toContain('all: "0101 - 1001 - 1010 - 0110 fill"');
    expect(yaml).toContain('terrain: clear');
  });

  it('updates YAML when inputs change', () => {
    const onCreateMap = vi.fn();
    render(<NewMapDialog onCreateMap={onCreateMap} onCancel={() => {}} />);
    
    const widthInput = screen.getByLabelText('Width:');
    fireEvent.change(widthInput, { target: { value: '5' } });
    
    const heightInput = screen.getByLabelText('Height:');
    fireEvent.change(heightInput, { target: { value: '5' } });
    
    const orientationSelect = screen.getByLabelText('Orientation:');
    fireEvent.change(orientationSelect, { target: { value: 'pointy-right' } });
    
    const originSelect = screen.getByLabelText('Origin:');
    fireEvent.change(originSelect, { target: { value: 'bottom-right' } });
    
    fireEvent.click(screen.getByText('Create'));
    
    const yaml = onCreateMap.mock.calls[0][0];
    
    expect(yaml).toContain('orientation: pointy-right');
    // bottom-right for 5x5: startX=5, startY=5, endX=1, endY=1
    expect(yaml).toContain('all: "0505 - 0105 - 0101 - 0501 fill"');
  });

  it('updates base terrain dropdown when palette changes', () => {
    render(<NewMapDialog onCreateMap={() => {}} onCancel={() => {}} />);
    
    const baseTerrainSelect = screen.getByLabelText('Base Terrain:') as HTMLSelectElement;
    expect(baseTerrainSelect.options.length).toBeGreaterThan(1);
    
    const paletteSelect = screen.getByLabelText('Starter Palette:');
    fireEvent.change(paletteSelect, { target: { value: 'blank' } });
    
    // Base terrain should change to 'none' and have no other options except 'None'
    expect(baseTerrainSelect.options.length).toBe(1);
    expect(baseTerrainSelect.value).toBe('none');
  });
});