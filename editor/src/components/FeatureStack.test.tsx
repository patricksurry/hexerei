import { describe, it, expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MapCommand, FeatureItem } from '@hexmap/canvas';
import { FeatureStack } from './FeatureStack';

describe('FeatureStack', () => {
  it('renders empty list', () => {
    const { container } = render(<FeatureStack features={[]} terrainColor={() => '#000'} />);
    expect(container).toBeDefined();
  });

  it('renders [+] button that dispatches addFeature', () => {
    const dispatched: MapCommand[] = [];
    render(
      <FeatureStack
        features={[]}
        terrainColor={() => '#000'}
        dispatch={(cmd) => dispatched.push(cmd)}
      />
    );
    const addBtn = screen.getByLabelText('Add feature');
    fireEvent.click(addBtn);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('addFeature');
  });

  test('shows all features when filteredIndices is null', () => {
    const features = [
      { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
      { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} filteredIndices={null} terrainColor={() => '#000'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('shows only matching features when filteredIndices is set', () => {
    const features = [
      { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
      { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} filteredIndices={[1]} terrainColor={() => '#000'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Woods')).toBeDefined();
  });

  test('shows match count in header when filtering', () => {
    const features = [
      { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [] },
      { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Woods' },
      { index: 2, terrain: 'forest', at: '0301', isBase: false, hexIds: [], tags: [], label: 'Grove' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} filteredIndices={[1, 2]} terrainColor={() => '#000'} />);
    expect(screen.getByText('2 of 3 features')).toBeDefined();
  });

  test('renders features in reverse visual order', () => {
    const features = [
      { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [], label: 'Base' },
      { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Top' },
    ] as FeatureItem[];
    render(<FeatureStack features={features} filteredIndices={null} terrainColor={() => '#000'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Top should be first visually
    expect(items[0].textContent).toContain('Top');
    expect(items[1].textContent).toContain('Base');
  });

  test('click on top visual item dispatches onSelect with the correct last data index', () => {
    const features = [
      { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [], label: 'Base' },
      { index: 1, terrain: 'forest', at: '0201', isBase: false, hexIds: [], tags: [], label: 'Top' },
    ] as FeatureItem[];
    const onSelect = vi.fn();
    render(
      <FeatureStack 
        features={features} 
        filteredIndices={null} 
        terrainColor={() => '#000'} 
        onSelect={onSelect}
      />
    );
    const items = screen.getAllByRole('listitem');
    // Click the first visual item ('Top', index 1)
    fireEvent.click(items[0]);
    expect(onSelect).toHaveBeenCalledWith([1], 'none');
  });

  describe('label display priority', () => {
    const base = {
      isBase: false,
      hexIds: [],
      edgeIds: [],
      vertexIds: [],
      tags: [],
      geometryType: 'hex' as const,
      segments: [],
    };

    test('shows label when present', () => {
      const features = [
        { ...base, index: 0, terrain: 'forest', at: '0101', label: 'Woods', id: 'f1' },
      ] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('Woods')).toBeDefined();
    });

    test('shows id when no label', () => {
      const features = [
        { ...base, index: 0, terrain: 'forest', at: '0101', id: 'river-1' },
      ] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('river-1')).toBeDefined();
    });

    test('shows terrain when no label or id', () => {
      const features = [
        { ...base, index: 0, terrain: 'forest', at: '0101' },
      ] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('forest')).toBeDefined();
    });

    test('shows fallback when nothing else', () => {
      const features = [
        { ...base, index: 0, terrain: '', at: '0101' },
      ] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('Feature 0')).toBeDefined();
    });
  });
});
