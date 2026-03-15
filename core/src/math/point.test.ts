import { expect, test } from 'vitest';
import type { Point } from './hex-math.js';

test('Point interface exists and can be assigned', () => {
  const p: Point = { x: 10, y: 20 };
  expect(p.x).toBe(10);
  expect(p.y).toBe(20);
});
