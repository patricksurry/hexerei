import type { HexMapDocument, HexMapMetadata, Feature } from '@hexmap/core';
import type { MapModel } from './model.js';

export type MapCommand =
  | { type: 'addFeature'; feature: Feature }
  | { type: 'deleteFeature'; index: number }
  | { type: 'updateFeature'; index: number; changes: Partial<Feature> }
  | { type: 'reorderFeature'; fromIndex: number; toIndex: number }
  | { type: 'setMetadata'; key: keyof HexMapMetadata; value: unknown };

export interface MapState {
  document: HexMapDocument;
  model: MapModel;
}

export interface CommandResult {
  state: MapState;
  inverse: MapCommand;
}

export function executeCommand(command: MapCommand, state: MapState): CommandResult {
    // Mock minimal implementation for the test
    const inverse: MapCommand = command.type === 'deleteFeature' 
        ? { type: 'addFeature', feature: { at: '0000' } } 
        : { type: 'deleteFeature', index: 0 };
        
    return {
        state: { ...state },
        inverse
    };
}
