import type { FeatureItem, MapCommand } from '@hexmap/canvas';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, test, vi } from 'vitest';
import { FeatureStack } from './FeatureStack';

const featureBase = { hexIds: [] as string[], edgeIds: [] as string[], vertexIds: [] as string[], geometryType: 'hex' as const, tags: [] as string[] };

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
    const features: FeatureItem[] = [
      { ...featureBase, index: 0, terrain: 'clear', at: '@all', isBase: true },
      { ...featureBase, index: 1, terrain: 'forest', at: '0201', isBase: false, label: 'Woods' },
    ];
    render(<FeatureStack features={features} filteredIndices={null} terrainColor={() => '#000'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  test('shows only matching features when filteredIndices is set', () => {
    const features: FeatureItem[] = [
      { ...featureBase, index: 0, terrain: 'clear', at: '@all', isBase: true },
      { ...featureBase, index: 1, terrain: 'forest', at: '0201', isBase: false, label: 'Woods' },
    ];
    render(<FeatureStack features={features} filteredIndices={[1]} terrainColor={() => '#000'} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText('Woods')).toBeDefined();
  });

  test('shows match count in header when filtering', () => {
    const features: FeatureItem[] = [
      { ...featureBase, index: 0, terrain: 'clear', at: '@all', isBase: true },
      { ...featureBase, index: 1, terrain: 'forest', at: '0201', isBase: false, label: 'Woods' },
      { ...featureBase, index: 2, terrain: 'forest', at: '0301', isBase: false, label: 'Grove' },
    ];
    render(
      <FeatureStack features={features} filteredIndices={[1, 2]} terrainColor={() => '#000'} />
    );
    expect(screen.getByText('2 of 3 features')).toBeDefined();
  });

  test('renders features in reverse visual order', () => {
    const features: FeatureItem[] = [
      { ...featureBase, index: 0, terrain: 'clear', at: '@all', isBase: true, label: 'Base' },
      { ...featureBase, index: 1, terrain: 'forest', at: '0201', isBase: false, label: 'Top' },
    ];
    render(<FeatureStack features={features} filteredIndices={null} terrainColor={() => '#000'} />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    // Top should be first visually
    expect(items[0].textContent).toContain('Top');
    expect(items[1].textContent).toContain('Base');
  });

  test('click on top visual item dispatches onSelect with the correct last data index', () => {
    const features: FeatureItem[] = [
      { ...featureBase, index: 0, terrain: 'clear', at: '@all', isBase: true, label: 'Base' },
      { ...featureBase, index: 1, terrain: 'forest', at: '0201', isBase: false, label: 'Top' },
    ];
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
      const features = [{ ...base, index: 0, terrain: 'forest', at: '0101' }] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('forest')).toBeDefined();
    });

    test('shows fallback when nothing else', () => {
      const features = [{ ...base, index: 0, terrain: '', at: '0101' }] as FeatureItem[];
      render(<FeatureStack features={features} terrainColor={() => '#000'} />);
      expect(screen.getByText('Feature 0')).toBeDefined();
    });
  });
});
