import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { downloadFile } from './download';

describe('downloadFile', () => {
  let clickSpy: MockInstance;
  let revokeObjectUrlSpy: MockInstance;

  beforeEach(() => {
    // Ensure URL methods exist for jsdom
    if (typeof URL.createObjectURL === 'undefined') {
      URL.createObjectURL = vi.fn();
    }
    if (typeof URL.revokeObjectURL === 'undefined') {
      URL.revokeObjectURL = vi.fn();
    }

    clickSpy = vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a blob and triggers download', () => {
    downloadFile('hello', 'test.yaml', 'text/yaml');
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock');
  });
});
