import { expect, test } from 'vitest';
import { executeCommand, MapCommand, MapState } from './command.js';

test('executeCommand returns new state and inverse command', () => {
    const state: MapState = { document: {} as any, model: {} as any };
    const cmd: MapCommand = { type: 'deleteFeature', index: 0 };
    
    const result = executeCommand(cmd, state);
    expect(result.inverse.type).toBe('addFeature');
});
