import type { FeatureItem } from '@hexmap/canvas';
import { describe, expect, test } from 'vitest';
import { filterFeatures } from './filter-features';

const mockFeatures: FeatureItem[] = [
  { index: 0, terrain: 'clear', at: '@all', isBase: true, hexIds: [], tags: [], label: 'Base' },
  {
    index: 1,
    terrain: 'forest',
    at: '0201',
    isBase: false,
    hexIds: [],
    tags: ['dense'],
    label: 'Dark Forest',
  },
  {
    index: 2,
    terrain: 'river',
    at: '0101/E',
    isBase: false,
    hexIds: [],
    tags: ['waterway'],
    label: 'Elbe',
  },
  {
    index: 3,
    terrain: 'forest',
    at: '0301',
    isBase: false,
    hexIds: [],
    tags: [],
    label: 'Light Forest',
  },
];

describe('filterFeatures', () => {
  test('key:value search — terrain:forest', () => {
    expect(filterFeatures(mockFeatures, 'terrain:forest')).toEqual([1, 3]);
  });

  test('key:value search — tags:waterway', () => {
    expect(filterFeatures(mockFeatures, 'tags:waterway')).toEqual([2]);
  });

  test('key:value search — label:dark', () => {
    expect(filterFeatures(mockFeatures, 'label:dark')).toEqual([1]);
  });

  test('key:value search — at:0101', () => {
    expect(filterFeatures(mockFeatures, 'at:0101')).toEqual([2]);
  });

  test('fuzzy search — "forest"', () => {
    expect(filterFeatures(mockFeatures, 'forest')).toEqual([1, 3]);
  });

  test('fuzzy search — "elbe"', () => {
    expect(filterFeatures(mockFeatures, 'elbe')).toEqual([2]);
  });

  test('fuzzy search — "0201"', () => {
    expect(filterFeatures(mockFeatures, '0201')).toEqual([1]);
  });

  test('fuzzy search — "dense" (tag)', () => {
    expect(filterFeatures(mockFeatures, 'dense')).toEqual([1]);
  });

  test('no match returns empty', () => {
    expect(filterFeatures(mockFeatures, 'swamp')).toEqual([]);
  });

  test('case insensitive search', () => {
    expect(filterFeatures(mockFeatures, 'FOREST')).toEqual([1, 3]);
    expect(filterFeatures(mockFeatures, 'Terrain:RIVER')).toEqual([2]);
  });
});
