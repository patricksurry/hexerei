import { expect, test } from 'vitest';
import type { HexMapLayout, HexMapMetadata, GeoReference } from './types.js';

test('Envelope types are correctly exported', () => {
    const layout: HexMapLayout = { orientation: 'flat-down', all: 'base' };
    const meta: HexMapMetadata = { title: 'Test Map' };
    const geo: GeoReference = { scale: 1000 };
    
    expect(layout.all).toBe('base');
    expect(meta.title).toBe('Test Map');
    expect(geo.scale).toBe(1000);
});
