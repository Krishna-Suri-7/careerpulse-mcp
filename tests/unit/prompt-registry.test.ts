import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  PROMPT_REGISTRY,
  PROMPT_DEFINITIONS,
  registerPromptHandlers,
} from '../../src/handlers/prompt-registry.js';

describe('Prompt Registry (Unit)', () => {
  it('registers all 4 mandatory 1-click prompt presets defined in AGENTS.md', () => {
    expect(PROMPT_REGISTRY['audit-my-profile']).toBeDefined();
    expect(PROMPT_REGISTRY['target-job-fit']).toBeDefined();
    expect(PROMPT_REGISTRY['write-proof-of-work']).toBeDefined();
    expect(PROMPT_REGISTRY['30-day-visibility-plan']).toBeDefined();
  });

  it('exports PROMPT_DEFINITIONS array matching all 4 presets', () => {
    expect(PROMPT_DEFINITIONS).toHaveLength(4);
    const names = PROMPT_DEFINITIONS.map((p) => p.name);
    expect(names).toContain('audit-my-profile');
    expect(names).toContain('target-job-fit');
    expect(names).toContain('write-proof-of-work');
    expect(names).toContain('30-day-visibility-plan');
  });

  describe('1. audit-my-profile prompt handler', () => {
    it('constructs actionable instruction with filePath', async () => {
      const result = await PROMPT_REGISTRY['audit-my-profile'].handler({
        filePath: 'C:/Users/test/Profile.pdf',
        targetRole: 'Staff Distributed Systems Engineer',
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0].content.text;
      expect(text).toContain('ingest_profile');
      expect(text).toContain('C:/Users/test/Profile.pdf');
      expect(text).toContain('audit_job_readiness');
      expect(text).toContain('Staff Distributed Systems Engineer');
      expect(text).toContain('XYZ formula');
      expect(text).toContain('Top 3 Weakest Bullet Points');
    });

    it('constructs prompt asking for profile when no arguments are provided', async () => {
      const result = await PROMPT_REGISTRY['audit-my-profile'].handler({});
      const text = result.messages[0].content.text;
      expect(text).toContain('Ask the candidate to provide the local path');
      expect(text).toContain('audit_job_readiness');
    });
  });

  describe('2. target-job-fit prompt handler', () => {
    it('constructs prompt with target job description and boolean query instruction', async () => {
      const result = await PROMPT_REGISTRY['target-job-fit'].handler({
        targetJobDescription: 'Seeking Senior Backend Engineer with TypeScript, Go, Redis, and Kubernetes.',
        targetRoleTitle: 'Senior Backend Engineer',
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0].content.text;
      expect(text).toContain('analyze_role_fit');
      expect(text).toContain('TypeScript, Go, Redis');
      expect(text).toContain('Recruiter Boolean Search Query String');
      expect(text).toContain('Missing Hard Competencies');
    });
  });

  describe('3. write-proof-of-work prompt handler', () => {
    it('constructs prompt enforcing under 180 words and anti-cliche rules', async () => {
      const result = await PROMPT_REGISTRY['write-proof-of-work'].handler({
        technicalNotes: 'Refactored auth token validation caching with Redis sliding window',
        type: 'performance_optimization',
        githubUrl: 'https://github.com/example/auth-cache',
        metrics: 'reduced auth latency by 70%',
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0].content.text;
      expect(text).toContain('draft_proof_of_work_post');
      expect(text).toContain('https://github.com/example/auth-cache');
      expect(text).toContain('reduced auth latency by 70%');
      expect(text).toContain('Under 180 words');
      expect(text).toContain('Banned: "thrilled to announce"');
    });
  });

  describe('4. 30-day-visibility-plan prompt handler', () => {
    it('constructs prompt requesting 30-day passive candidate discovery plan', async () => {
      const result = await PROMPT_REGISTRY['30-day-visibility-plan'].handler({
        targetRole: 'Staff Infrastructure Architect',
        primaryTechStack: 'Go, Kubernetes, Terraform, AWS',
        cadenceDays: '30',
      });

      expect(result.messages).toHaveLength(1);
      const text = result.messages[0].content.text;
      expect(text).toContain('generate_passive_visibility_plan');
      expect(text).toContain('Staff Infrastructure Architect');
      expect(text).toContain('Spotlight: Active in past 30 days');
      expect(text).toContain('Execution Calendar');
      expect(text).toContain('Anti-Cringe Commenting Blueprints');
    });
  });

  describe('registerPromptHandlers', () => {
    it('registers ListPrompts and GetPrompt handlers on Server instance', async () => {
      const server = new Server(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { prompts: {} } }
      );
      registerPromptHandlers(server);

      // Invoke list prompts handler directly
      const listHandler = (server as any)._requestHandlers.get(
        ListPromptsRequestSchema.shape.method.value
      );
      expect(listHandler).toBeDefined();

      const listResult = await listHandler({ method: 'prompts/list', params: {} });
      expect(listResult.prompts).toHaveLength(4);

      // Invoke get prompt handler directly
      const getHandler = (server as any)._requestHandlers.get(
        GetPromptRequestSchema.shape.method.value
      );
      expect(getHandler).toBeDefined();

      const getResult = await getHandler({
        method: 'prompts/get',
        params: { name: 'audit-my-profile', arguments: { targetRole: 'Tech Lead' } },
      });
      expect(getResult.messages[0].content.text).toContain('Tech Lead');
    });

    it('throws McpError on unknown prompt name', async () => {
      const server = new Server(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { prompts: {} } }
      );
      registerPromptHandlers(server);

      const getHandler = (server as any)._requestHandlers.get(
        GetPromptRequestSchema.shape.method.value
      );
      await expect(
        getHandler({
          method: 'prompts/get',
          params: { name: 'non-existent-preset' },
        })
      ).rejects.toThrow('Unknown prompt');
    });
  });
});
