import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeatureStack } from './FeatureStack';

const MOCK_FEATURES: any[] = [
  {
    index: 0,
    at: '@all',
    terrain: 'clear',
    isBase: true,
    tags: [],
    hexIds: [],
    geometryType: 'hex',
  },
  {
    index: 1,
    at: '0304',
    terrain: 'forest',
    label: 'Trenice Forest',
    isBase: false,
    tags: [],
    hexIds: [],
    geometryType: 'hex',
  },
];

describe('FeatureStack Smoketest', () => {
  it('renders features', () => {
    render(<FeatureStack features={MOCK_FEATURES as any} terrainColor={() => '#000'} />);
    expect(screen.getByText('Trenice Forest')).toBeDefined();
  });

  it('passes geometry type to terrainColor callback', () => {
    const edgeFeatures: any[] = [
      {
        index: 0,
        at: '0101/NE',
        terrain: 'river',
        isBase: false,
        tags: [],
        hexIds: [],
        edgeIds: ['a|b'],
        vertexIds: [],
        geometryType: 'edge',
      },
    ];
    const terrainColorSpy = vi.fn().mockReturnValue('#0044cc');
    render(<FeatureStack features={edgeFeatures} terrainColor={terrainColorSpy} />);

    // The callback should receive geometry so it can resolve the correct color
    expect(terrainColorSpy).toHaveBeenCalled();
    const [terrain, geometry] = terrainColorSpy.mock.calls[0];
    expect(terrain).toBe('river');
    expect(geometry).toBe('edge');
  });
});
