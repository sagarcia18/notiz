import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { type CallToolResult, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'node:fs';
import { buildApp } from '../../../apps/server/src/app.js';
import type { AppDatabase } from '../../../apps/server/src/db/client.js';
import { createTempDataDir, createTestDatabase } from '../../../apps/server/test/helpers.js';
import { type FetchLike, NotizApi } from '../src/apiClient.js';
import { createNotizMcpServer } from '../src/server.js';

const BASE_URL = 'http://notiz.test';

/** Typed through buildApp because fastify is a dependency of the server, not of this package. */
type NotizApp = ReturnType<typeof buildApp>;
type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE';

/** Sends fetch calls into the Fastify app without opening a port. */
function injectFetch(app: NotizApp): FetchLike {
  return async (url, init) => {
    const payload = typeof init.body === 'string' ? init.body : undefined;
    const response = await app.inject({
      method: (init.method ?? 'GET') as Method,
      url: url.slice(BASE_URL.length),
      headers: payload === undefined ? {} : { 'content-type': 'application/json' },
      payload,
    });
    const body = response.statusCode === 204 ? null : response.body;
    return new Response(body, { status: response.statusCode });
  };
}

/** A real MCP client talking to the Notiz MCP server, backed by an in-memory Notiz API. */
export class McpHarness {
  readonly db: AppDatabase = createTestDatabase();
  private readonly dataDir = createTempDataDir();
  readonly app: NotizApp = buildApp({ db: this.db, dataDir: this.dataDir });
  readonly client = new Client({ name: 'notiz-test', version: '0.0.0' });

  async connect(): Promise<void> {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createNotizMcpServer(new NotizApi(BASE_URL, injectFetch(this.app)));
    await server.connect(serverTransport);
    await this.client.connect(clientTransport);
  }

  async close(): Promise<void> {
    await this.client.close();
    await this.app.close();
    this.db.$client.close();
    fs.rmSync(this.dataDir, { recursive: true, force: true });
  }

  async call(name: string, args: Record<string, unknown> = {}): Promise<CallToolResult> {
    return CallToolResultSchema.parse(await this.client.callTool({ name, arguments: args }));
  }

  /** Calls a tool that must succeed and returns its parsed JSON answer. */
  async json(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await this.call(name, args);
    const text = textOf(result);
    if (result.isError === true) throw new Error(`${name} failed: ${text}`);
    return JSON.parse(text);
  }
}

export function textOf(result: CallToolResult): string {
  const first = result.content[0];
  return first?.type === 'text' ? first.text : '';
}
