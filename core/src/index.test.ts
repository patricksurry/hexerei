import { expect, test } from 'vitest';
import * as Core from './index.js';

test('Core exports types and functions correctly', () => {
    expect(Core.HexMapDocument).toBeDefined();
    expect(Core.HexMesh).toBeDefined();
    expect(Core.HexPath).toBeDefined();
});
