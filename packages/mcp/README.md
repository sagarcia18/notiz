# @notiz/mcp

MCP server that lets Claude read and write Notiz data. It talks only to the Notiz REST API, so the Notiz server must be running (`pnpm dev` in the repo root).

## Setup

Claude Code (run in the repo root):

```bash
claude mcp add notiz -- pnpm --dir "C:/Users/<you>/source/repos/Notion clon" --filter @notiz/mcp start
```

Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "notiz": {
      "command": "pnpm",
      "args": [
        "--dir",
        "C:/Users/<you>/source/repos/Notion clon",
        "--filter",
        "@notiz/mcp",
        "start"
      ]
    }
  }
}
```

The server reads `NOTIZ_API_URL`, else `API_PORT` from the repo `.env` (default `http://127.0.0.1:3001`, the same default as the API server). To point it elsewhere: `claude mcp add notiz -e NOTIZ_API_URL=http://127.0.0.1:4100 -- pnpm ...`, or `"env": { "NOTIZ_API_URL": "..." }` in the Desktop config.

## Tools

| Tool                    | What it does                                                        |
| ----------------------- | ------------------------------------------------------------------- |
| `list_page_tree`        | All active pages as a tree (without database rows)                  |
| `get_page`              | Page detail with `content` (BlockNote) and plain `text`             |
| `search_pages`          | Full-text search (titles, text, diagram labels, descriptions)       |
| `create_page`           | New doc, database, dashboard or bpmn page, optional initial `text`  |
| `update_page`           | Title, icon, `text` or `content`, diagram XML, database description |
| `move_page`             | Move under another page or to the top level                         |
| `trash_page`            | Move a page and its subpages to the trash                           |
| `get_database`          | Properties (with option ids) and views                              |
| `list_database_rows`    | Rows of a view (first view by default) plus the property list       |
| `create_database_row`   | Add a row with values keyed by property id                          |
| `update_database_row`   | Merge values into a row                                             |
| `add_database_property` | Add a property (text, number, select, status, date, checkbox, url)  |
| `query_database`        | Ad-hoc filter/sort/page by property and option names                |
| `aggregate_database`    | Count, sum or average, optionally grouped by select/status          |
| `get_diagram_links`     | Diagram elements linked to pages/rows/databases, resolved           |
| `get_diagram_usages`    | Diagrams that link to a page                                        |

`text` is simple Markdown-like input, one block per line: `#`/`##`/`###` headings, `- ` bullets, `1. ` numbered items, `[ ] `/`[x] ` checklist items, everything else a paragraph.
