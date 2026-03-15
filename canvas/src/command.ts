import {
  HexMapDocument,
  type HexMapMetadata,
  type HexMapLayout,
  type Feature,
  type TerrainTypeDef,
} from '@hexmap/core';
import { MapModel } from './model.js';

export type MapCommand =
  | { type: 'addFeature'; feature: Feature }
  | { type: 'deleteFeature'; index: number }
  | { type: 'updateFeature'; index: number; changes: Partial<Feature> }
  | { type: 'reorderFeature'; fromIndex: number; toIndex: number }
  | { type: 'setMetadata'; key: keyof HexMapMetadata; value: unknown }
  | { type: 'setLayout'; key: keyof HexMapLayout; value: unknown }
  | {
      type: 'setTerrainType';
      geometry: 'hex' | 'edge' | 'vertex';
      key: string;
      def: TerrainTypeDef;
    }
  | { type: 'deleteTerrainType'; geometry: 'hex' | 'edge' | 'vertex'; key: string };

export interface MapState {
  document: HexMapDocument;
  model: MapModel;
}

export interface CommandResult {
  state: MapState;
  inverse: MapCommand;
}

export function executeCommand(command: MapCommand, state: MapState): CommandResult {
  // Clone document via YAML round-trip to avoid mutating original
  const doc = new HexMapDocument(state.document.toString());
  let inverse: MapCommand;

  switch (command.type) {
    case 'addFeature': {
      doc.addFeature(command.feature);
      const newFeatures = doc.getFeatures();
      inverse = { type: 'deleteFeature', index: newFeatures.length - 1 };
      break;
    }
    case 'deleteFeature': {
      const deleted = doc.deleteFeature(command.index);
      inverse = { type: 'addFeature', feature: deleted };
      break;
    }
    case 'updateFeature': {
      // Capture current values for inverse
      const currentFeatures = doc.getFeatures();
      const current = currentFeatures[command.index];
      const previousValues: Partial<Feature> = {};
      for (const key of Object.keys(command.changes) as (keyof Feature)[]) {
        previousValues[key] = current[key] as any;
      }
      doc.updateFeature(command.index, command.changes);
      inverse = { type: 'updateFeature', index: command.index, changes: previousValues };
      break;
    }
    case 'reorderFeature': {
      doc.reorderFeature(command.fromIndex, command.toIndex);
      inverse = { type: 'reorderFeature', fromIndex: command.toIndex, toIndex: command.fromIndex };
      break;
    }
    case 'setMetadata': {
      const previousValue = doc.getMetadata()[command.key] ?? undefined;
      doc.setMetadata(command.key, command.value as any);
      inverse = { type: 'setMetadata', key: command.key, value: previousValue };
      break;
    }
    case 'setLayout': {
      const previousValue = doc.getLayout()[command.key];
      doc.setLayout(command.key, command.value as any);
      inverse = { type: 'setLayout', key: command.key, value: previousValue };
      break;
    }
    case 'setTerrainType': {
      const terrain = doc.getTerrain();
      const existing = terrain[command.geometry]?.[command.key];
      if (existing) {
        // Updating existing — inverse restores old definition
        inverse = {
          type: 'setTerrainType',
          geometry: command.geometry,
          key: command.key,
          def: existing,
        };
      } else {
        // Adding new — inverse deletes it
        inverse = { type: 'deleteTerrainType', geometry: command.geometry, key: command.key };
      }
      doc.setTerrainType(command.geometry, command.key, command.def);
      break;
    }
    case 'deleteTerrainType': {
      const terrain = doc.getTerrain();
      const existing = terrain[command.geometry]?.[command.key];
      if (!existing) {
        inverse = { type: 'deleteTerrainType', geometry: command.geometry, key: command.key };
      } else {
        inverse = {
          type: 'setTerrainType',
          geometry: command.geometry,
          key: command.key,
          def: existing,
        };
      }
      doc.deleteTerrainType(command.geometry, command.key);
      break;
    }
    default: {
      const _exhaustive: never = command;
      throw new Error(`Unknown command type: ${(_exhaustive as any).type}`);
    }
  }

  const model = MapModel.fromDocument(doc);
  return { state: { document: doc, model }, inverse };
}
