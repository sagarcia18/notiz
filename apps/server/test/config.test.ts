import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.js';

describe('loadConfig', () => {
  it('listens on API_PORT, default 3001', () => {
    expect(loadConfig({}).port).toBe(3001);
    expect(loadConfig({ API_PORT: '4100' }).port).toBe(4100);
  });

  it('ignores PORT, which launchers set for the web dev server', () => {
    expect(loadConfig({ PORT: '5173' }).port).toBe(3001);
  });
});
