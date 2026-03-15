import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureStack } from './FeatureStack';

const MOCK_FEATURES: any[] = [
  { index: 0, at: '@all', terrain: 'clear', isBase: true, tags: [], hexIds: [] },
  {
    index: 1,
    at: '0304',
    terrain: 'forest',
    label: 'Trenice Forest',
    isBase: false,
    tags: [],
    hexIds: [],
  },
];

describe('FeatureStack Smoketest', () => {
  it('renders features', () => {
    render(<FeatureStack features={MOCK_FEATURES as any} terrainColor={() => '#000'} />);
    expect(screen.getByText('Trenice Forest')).toBeDefined();
  });
});
