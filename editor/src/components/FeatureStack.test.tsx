import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureStack } from './FeatureStack';
import type { MapCommand } from '@hexmap/canvas';

describe('FeatureStack', () => {
  it('renders empty list', () => {
    const { container } = render(<FeatureStack features={[]} terrainColor={() => '#000'} />);
    expect(container).toBeDefined();
  });

  it('renders [+] button that dispatches addFeature', () => {
    const dispatched: MapCommand[] = [];
    render(<FeatureStack features={[]} terrainColor={() => '#000'} dispatch={(cmd) => dispatched.push(cmd)} />);
    const addBtn = screen.getByLabelText('Add feature');
    fireEvent.click(addBtn);
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0].type).toBe('addFeature');
  });
});
