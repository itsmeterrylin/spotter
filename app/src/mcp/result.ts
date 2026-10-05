import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type ToolResult = Record<string, unknown>;

export const ok = (result: ToolResult): CallToolResult => ({ content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result });

export const fail = (code: string, message: string): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify({ error: { code, message } }) }],
  isError: true,
});

export const later = (phase: number): string => `available after phase ${phase}`;
