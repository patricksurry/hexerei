import { describe, it, expect } from 'vitest';
import { Hex } from '@hexmap/core';

describe('Editor-Core Wiring', () => {
  it('should resolve @hexmap/core from editor', () => {
    const hex = Hex.createHex(1, 2);
    expect(hex.q).toBe(1);
    expect(hex.r).toBe(2);
    expect(hex.s).toBe(-3);
  });
});
