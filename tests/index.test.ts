import { describe, it, expect } from 'vitest';
import { createLinkedInMcpServer } from '../src/index.js';

describe('LinkedIn Profile Manager MCP Server Initialization', () => {
  it('initializes McpServer instance with all 5 mandatory tools registered', () => {
    const server = createLinkedInMcpServer();
    expect(server).toBeDefined();

    // Check that all 5 mandatory tools are registered
    const registeredTools = Object.keys((server as any)._registeredTools);
    expect(registeredTools).toContain('parse_profile_pdf');
    expect(registeredTools).toContain('audit_profile');
    expect(registeredTools).toContain('keyword_gap_analysis');
    expect(registeredTools).toContain('rewrite_section');
    expect(registeredTools).toContain('export_profile_diff');
    expect(registeredTools.length).toBeGreaterThanOrEqual(5);
  });
});
