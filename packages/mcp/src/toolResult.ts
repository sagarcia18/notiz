import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { NotizApiError } from './apiClient.js';

export function jsonResult(value: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] };
}

export function errorResult(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/** Runs a tool body; API errors become tool errors Claude can read instead of protocol errors. */
export async function runTool(body: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return jsonResult(await body());
  } catch (error) {
    if (error instanceof NotizApiError) return errorResult(`${error.code}: ${error.message}`);
    throw error;
  }
}
