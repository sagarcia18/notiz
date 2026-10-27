import { describe, expect, it } from 'vitest';
import { devServerSettings } from './devServer';

describe('devServerSettings', () => {
  it('stays on this computer without WEB_HOST', () => {
    expect(devServerSettings({})).toEqual({
      host: undefined,
      apiTarget: 'http://127.0.0.1:3001',
    });
    expect(devServerSettings({ WEB_HOST: '  ' }).host).toBeUndefined();
  });

  it('listens on the given address and keeps the API on this computer', () => {
    expect(devServerSettings({ WEB_HOST: ' 100.64.0.7 ', API_PORT: '4100' })).toEqual({
      host: '100.64.0.7',
      apiTarget: 'http://127.0.0.1:4100',
    });
  });
});
