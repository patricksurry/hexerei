import { describe, it, expect, test } from 'vitest';
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
});
