import { describe, it, expect } from 'vitest';
import { createCareerPulseServer, createIntelligenceServer } from '../../src/server.js';
import {
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('Server Entrypoint (Unit)', () => {
  it('initializes Server with capabilities { tools: {}, prompts: {} } and registers tools and prompts', async () => {
    const server = createCareerPulseServer();
    expect(server).toBeDefined();

    // Verify capabilities
    expect((server as any)._capabilities.tools).toBeDefined();
    expect((server as any)._capabilities.prompts).toBeDefined();

    // Verify tools registered
    const registeredTools = Object.keys((server as any)._registeredTools);
    expect(registeredTools).toContain('ingest_profile');
    expect(registeredTools).toContain('audit_job_readiness');
    expect(registeredTools).toContain('analyze_role_fit');
    expect(registeredTools).toContain('synthesize_profile_diff');
    expect(registeredTools).toContain('draft_proof_of_work_post');
    expect(registeredTools).toContain('generate_passive_visibility_plan');
    expect(registeredTools).toContain('humanize_content');

    // Verify prompts registered
    const registeredPrompts = Object.keys((server as any)._registeredPrompts);
    expect(registeredPrompts).toContain('audit-my-profile');
    expect(registeredPrompts).toContain('target-job-fit');
    expect(registeredPrompts).toContain('write-proof-of-work');
    expect(registeredPrompts).toContain('30-day-visibility-plan');

    // Verify tools/list request handler returns all tools
    const toolsHandler = (server as any)._requestHandlers.get(
      ListToolsRequestSchema.shape.method.value
    );
    expect(toolsHandler).toBeDefined();
    const toolsResult = await toolsHandler({ method: 'tools/list', params: {} });
    expect(toolsResult.tools.length).toBeGreaterThanOrEqual(6);

    // Verify prompts/list request handler returns all 4 presets
    const promptsHandler = (server as any)._requestHandlers.get(
      ListPromptsRequestSchema.shape.method.value
    );
    expect(promptsHandler).toBeDefined();
    const promptsResult = await promptsHandler({ method: 'prompts/list', params: {} });
    expect(promptsResult.prompts).toHaveLength(4);
  });

  it('maintains backwards-compatible createIntelligenceServer alias', () => {
    const server = createIntelligenceServer();
    expect(server).toBeDefined();
    const registered = Object.keys((server as any)._registeredTools);
    expect(registered).toContain('ingest_profile');
    expect(registered).toContain('draft_proof_of_work_post');
  });
});
