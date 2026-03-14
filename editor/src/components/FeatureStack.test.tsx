import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureStack } from './FeatureStack';


describe('FeatureStack', () => {
  it('renders empty list', () => {
    const { container } = render(<FeatureStack features={[]} terrainColor={() => '#000'} />);
    expect(container).toBeDefined();
  });
});
