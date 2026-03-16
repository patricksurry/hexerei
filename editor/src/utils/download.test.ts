import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { downloadFile } from './download';

describe('downloadFile', () => {
  let clickSpy: ReturnType<typeof vi.fn>;
  let createElementSpy: MockInstance;
  let revokeObjectURLSpy: MockInstance;

  beforeEach(() => {
    // Ensure URL methods exist for jsdom
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn();
    }
    if (typeof URL.revokeObjectURL === 'undefined') {
      URL.revokeObjectURL = vi.fn();
    }

    clickSpy = vi.fn();
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
      click: clickSpy,
      set href(_v: string) { /* noop */ },
      set download(_v: string) { /* noop */ },
    } as unknown as HTMLAnchorElement);
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob and triggers download', () => {
    downloadFile('hello', 'test.yaml', 'text/yaml');
    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock');
  });
});