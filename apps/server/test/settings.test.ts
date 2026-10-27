import { MCP_CLIENT_ID, NOTIZ_CLIENT_HEADER, settingsSchema } from '@notiz/shared';
import type { LightMyRequestResponse } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { PageApi, errorCode } from './pageApi.js';

const mcpHeaders = { [NOTIZ_CLIENT_HEADER]: MCP_CLIENT_ID };

describe('settings and MCP access', () => {
  let api: PageApi;

  beforeEach(() => {
    api = new PageApi();
  });

  afterEach(async () => {
    await api.close();
  });

  async function settings(): Promise<unknown> {
    return (await api.app.inject({ method: 'GET', url: '/api/settings' })).json();
  }

  function setMcp(mcpEnabled: boolean): Promise<LightMyRequestResponse> {
    return api.app.inject({ method: 'PATCH', url: '/api/settings', payload: { mcpEnabled } });
  }

  function mcpTree(): Promise<LightMyRequestResponse> {
    return api.app.inject({ method: 'GET', url: '/api/pages/tree', headers: mcpHeaders });
  }

  it('starts with MCP on and never used', async () => {
    expect(await settings()).toEqual({ mcpEnabled: true, mcpLastUsedAt: null });
  });

  it('records the last MCP request', async () => {
    expect((await mcpTree()).statusCode).toBe(200);
    const { mcpLastUsedAt } = settingsSchema.parse(await settings());
    expect(mcpLastUsedAt).not.toBeNull();
  });

  it('refuses MCP requests while off and lets the web app through', async () => {
    expect(settingsSchema.parse((await setMcp(false)).json()).mcpEnabled).toBe(false);

    const refused = await mcpTree();
    expect(refused.statusCode).toBe(403);
    expect(errorCode(refused.json())).toBe('mcp_disabled');
    const create = await api.app.inject({
      method: 'POST',
      url: '/api/pages',
      headers: mcpHeaders,
      payload: { title: 'From Claude' },
    });
    expect(create.statusCode).toBe(403);
    expect(await api.tree()).toEqual([]);
    expect(settingsSchema.parse(await settings()).mcpLastUsedAt).toBeNull();

    await setMcp(true);
    expect((await mcpTree()).statusCode).toBe(200);
  });

  it('keeps the switch across restarts', async () => {
    await setMcp(false);
    const restarted = buildApp({ db: api.db, dataDir: api.dataDir });
    const response = await restarted.inject({ method: 'GET', url: '/api/settings' });
    expect(settingsSchema.parse(response.json()).mcpEnabled).toBe(false);
    await restarted.close();
  });

  it('rejects an empty update', async () => {
    const response = await api.app.inject({ method: 'PATCH', url: '/api/settings', payload: {} });
    expect(response.statusCode).toBe(400);
  });
});
