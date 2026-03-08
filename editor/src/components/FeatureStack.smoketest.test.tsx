import { render } from '@testing-library/react';
import { FeatureStack } from './FeatureStack';
import { MapModel } from '../model/map-model';
import { describe, it, expect } from 'vitest';

describe('FeatureStack Smoketest', () => {
  it('should not crash when a feature has no terrain', () => {
    // Mock the YAML document with a feature missing terrain
    const yaml = `
hexmap: "1.0"
layout:
  all: "0101"
features:
  - label: "Broken Feature"
    at: "0101"
`;
    const model = MapModel.load(yaml);

    expect(() => {
      render(
        <FeatureStack
          features={model.features}
          terrainColor={(t) => model.terrainColor(t)}
        />
      );
    }).not.toThrow();
  });
});
