import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { NotizApi } from './apiClient.js';
import { registerDatabaseTools } from './tools/databases.tools.js';
import { registerDiagramTools } from './tools/diagrams.tools.js';
import { registerPageTools } from './tools/pages.tools.js';

const INSTRUCTIONS =
  "Notiz is the user's local notes app: nested pages (kind doc, database, dashboard, bpmn). " +
  'Start with search_pages or list_page_tree to find ids. Database rows are pages; their ' +
  'values are keyed by property id, so call get_database before writing values.';

/** The Notiz MCP server; every tool goes through the REST API of the Notiz server. */
export function createNotizMcpServer(api: NotizApi): McpServer {
  const server = new McpServer({ name: 'notiz', version: '0.1.0' }, { instructions: INSTRUCTIONS });
  registerPageTools(server, api);
  registerDatabaseTools(server, api);
  registerDiagramTools(server, api);
  return server;
}
