import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NotizApi } from './apiClient.js';
import { loadMcpConfig } from './config.js';
import { createNotizMcpServer } from './server.js';

const { apiUrl } = loadMcpConfig();
const server = createNotizMcpServer(new NotizApi(apiUrl));
await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol, so diagnostics go to stderr.
process.stderr.write(`notiz-mcp: connected, API at ${apiUrl}\n`);
