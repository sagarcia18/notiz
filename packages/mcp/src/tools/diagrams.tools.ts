import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { diagramLinkListSchema, diagramUsageListSchema, pageIdSchema } from '@notiz/shared';
import type { NotizApi } from '../apiClient.js';
import { runTool } from '../toolResult.js';

export function registerDiagramTools(server: McpServer, api: NotizApi): void {
  server.registerTool(
    'get_diagram_links',
    {
      title: 'Get diagram links',
      description:
        'Elements of a BPMN diagram page that link to pages or database rows ' +
        '(notiz:pageId in the XML), resolved with title, row status, and row count and ' +
        'description for linked databases. state "missing" means the target is gone. ' +
        'Links are changed by editing the diagram XML with update_page.',
      inputSchema: { diagramId: pageIdSchema },
      annotations: { readOnlyHint: true },
    },
    ({ diagramId }) =>
      runTool(() =>
        api.get(`/api/pages/${encodeURIComponent(diagramId)}/diagram-links`, diagramLinkListSchema),
      ),
  );

  server.registerTool(
    'get_diagram_usages',
    {
      title: 'Get diagram usages',
      description: 'Active BPMN diagrams that link to the given page ("used in diagrams").',
      inputSchema: { pageId: pageIdSchema },
      annotations: { readOnlyHint: true },
    },
    ({ pageId }) =>
      runTool(() =>
        api.get(`/api/pages/${encodeURIComponent(pageId)}/diagram-usages`, diagramUsageListSchema),
      ),
  );
}
