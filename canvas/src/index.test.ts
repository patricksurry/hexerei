import { expect, test } from 'vitest';
import * as Canvas from './index.js';

test('Canvas package skeleton exists', () => {
    expect(Canvas.VERSION).toBe('1.0.0');
});
