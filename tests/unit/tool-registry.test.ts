import { describe, it, expect } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  TOOL_REGISTRY,
  TOOL_DEFINITIONS,
  registerToolHandlers,
} from '../../src/handlers/tool-registry.js';
import { createSyntheticPdfBuffer } from '../testUtils.js';

describe('Tool Registry Dispatch (Unit - CareerPulse)', () => {
  it('has all 6 AGENTS.md core MCP tools registered in dictionary', () => {
    expect(TOOL_REGISTRY['ingest_profile']).toBeDefined();
    expect(TOOL_REGISTRY['audit_job_readiness']).toBeDefined();
    expect(TOOL_REGISTRY['analyze_role_fit']).toBeDefined();
    expect(TOOL_REGISTRY['synthesize_profile_diff']).toBeDefined();
    expect(TOOL_REGISTRY['draft_proof_of_work_post']).toBeDefined();
    expect(TOOL_REGISTRY['generate_passive_visibility_plan']).toBeDefined();
  });

  it('has all helper and backwards-compatibility aliases registered', () => {
    expect(TOOL_REGISTRY['ingest_profile_document']).toBeDefined();
    expect(TOOL_REGISTRY['evaluate_profile_ats']).toBeDefined();
    expect(TOOL_REGISTRY['analyze_keyword_gap']).toBeDefined();
    expect(TOOL_REGISTRY['synthesize_section_patch']).toBeDefined();
    expect(TOOL_REGISTRY['render_change_diff']).toBeDefined();
    expect(TOOL_REGISTRY['generate_proof_of_work']).toBeDefined();
    expect(TOOL_REGISTRY['humanize_content']).toBeDefined();
  });

  describe('1. ingest_profile handler', () => {
    it('successfully parses base64 PDF into contract format', async () => {
      const buf = createSyntheticPdfBuffer(['John Doe', 'Tech Lead', 'Summary', 'Backend engineer.', 'Skills', 'Go']);
      const base64 = buf.toString('base64');

      const response = await TOOL_REGISTRY['ingest_profile'].handler({ base64 });
      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.profile.fullName).toBe('John Doe');
    });

    it('returns isError: true on missing file', async () => {
      const response = await TOOL_REGISTRY['ingest_profile'].handler({
        filePath: './missing_file_abc.pdf',
      });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Failed to ingest profile');
    });
  });

  describe('2. audit_job_readiness handler', () => {
    it('evaluates profile and outputs composite score and factor breakdown', async () => {
      const response = await TOOL_REGISTRY['audit_job_readiness'].handler({
        profile: {
          headline: 'Senior Cloud Engineer | AWS, Kubernetes',
          summary: 'Cloud systems engineer with 8 years experience. Contact: cloud@test.org',
          experiences: [
            {
              title: 'Senior Engineer',
              company: 'Cloud Corp',
              bulletPoints: ['Engineered container platform, reducing build times by 50% via Docker.'],
            },
          ],
          skills: ['AWS', 'Docker', 'Kubernetes'],
          education: [],
        },
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.compositeScore).toBeGreaterThan(0);
      expect(parsed.factors.impactMetrics).toBeDefined();
      expect(parsed.factors.verbStrength).toBeDefined();
    });

    it('returns isError: true on invalid profile JSON', async () => {
      const response = await TOOL_REGISTRY['audit_job_readiness'].handler({
        profile: '{ unclosed json string',
      });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Failed to evaluate profile ATS');
    });
  });

  describe('3. analyze_role_fit handler', () => {
    it('analyzes gap against multiple target job descriptions and generates recruiter boolean queries', async () => {
      const response = await TOOL_REGISTRY['analyze_role_fit'].handler({
        profile: {
          headline: 'Developer',
          skills: ['TypeScript', 'Node.js'],
        },
        targetJobDescriptions: [
          'Seeking Staff Engineer with TypeScript, AWS, and Kubernetes.',
          'Secondary role: distributed systems, Redis, Kafka, and Node.js.',
        ],
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.hardSkills.matched).toContain('TypeScript');
      expect(parsed.hardSkills.missing).toContain('AWS');
      expect(parsed.recruiterBooleanSearchQueries).toBeDefined();
      expect(parsed.recruiterBooleanSearchQueries.candidateMatchingQuery).toContain('TypeScript');
    });

    it('returns isError: true when missing both JD and keywords', async () => {
      const response = await TOOL_REGISTRY['analyze_role_fit'].handler({
        profile: { headline: 'Developer' },
      });
      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Failed to analyze role fit');
    });
  });

  describe('4. synthesize_profile_diff handler', () => {
    it('synthesizes section patch and generates unified markdown diff', async () => {
      const response = await TOOL_REGISTRY['synthesize_profile_diff'].handler({
        profile: {
          headline: 'Developer',
          experiences: [
            {
              title: 'Engineer',
              company: 'Old Corp',
              bulletPoints: ['Maintained internal database.'],
            },
          ],
          skills: ['SQL'],
          education: [],
        },
        section: 'roles',
        targetRole: 'Senior Database Architect',
        focusKeywords: ['PostgreSQL', 'Redis'],
        metrics: ['latency by 40%'],
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.synthesizedContent).toContain('by');
      expect(parsed.markdownDiff).toContain('```diff');
    });

    it('diffs directly when proposedProfile is supplied', async () => {
      const response = await TOOL_REGISTRY['synthesize_profile_diff'].handler({
        profile: { headline: 'Old Headline' },
        proposedProfile: { headline: 'New Headline' },
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.hasDifferences).toBe(true);
    });
  });

  describe('5. draft_proof_of_work_post handler', () => {
    it('drafts a concise recruiter-facing post under 180 words', async () => {
      const response = await TOOL_REGISTRY['draft_proof_of_work_post'].handler({
        type: 'architecture_decision',
        technicalNotes: ['Replaced polling with WebSocket streaming', 'Reduced memory overhead by 30%'],
        githubUrl: 'https://github.com/example/streamer',
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.success).toBe(true);
      expect(parsed.headlineHook).toContain('Technical architecture trade-off:');
      expect(parsed.isUnder180Words).toBe(true);
      expect(parsed.formattedMarkdownPost).toContain('https://github.com/example/streamer');
    });
  });

  describe('6. generate_passive_visibility_plan handler', () => {
    it('generates a 30-day passive visibility plan', async () => {
      const response = await TOOL_REGISTRY['generate_passive_visibility_plan'].handler({
        targetRole: 'Principal Cloud Architect',
        primaryTechStack: ['AWS', 'Terraform', 'Kubernetes'],
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.targetRole).toBe('Principal Cloud Architect');
      expect(parsed.postDrafts).toHaveLength(2);
      expect(parsed.commentingBlueprints).toHaveLength(4);
      expect(parsed.formattedMarkdownPlan).toContain('30-Day Passive Visibility Plan');
    });
  });

  describe('7. humanize_content handler', () => {
    it('strips AI clichés from input text', async () => {
      const response = await TOOL_REGISTRY['humanize_content'].handler({
        text: 'I am thrilled to announce that we delve into cutting-edge distributed architectures.',
      });

      expect(response.isError).toBe(false);
      const parsed = JSON.parse(response.content[0].text);
      expect(parsed.humanizedText).not.toContain('thrilled to announce');
      expect(parsed.humanizedText).not.toContain('delve into');
      expect(parsed.clicheScore).toBeGreaterThan(0);
    });
  });

  describe('registerToolHandlers & TOOL_DEFINITIONS', () => {
    it('registers ListToolsRequestSchema and CallToolRequestSchema on Server instance', async () => {
      const server = new Server(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      registerToolHandlers(server);

      const listHandler = (server as any)._requestHandlers.get(
        ListToolsRequestSchema.shape.method.value
      );
      expect(listHandler).toBeDefined();

      const listResult = await listHandler({ method: 'tools/list', params: {} });
      expect(listResult.tools.length).toBeGreaterThanOrEqual(6);
      const names = listResult.tools.map((t: any) => t.name);
      expect(names).toContain('ingest_profile');
      expect(names).toContain('audit_job_readiness');
      expect(names).toContain('analyze_role_fit');
      expect(names).toContain('synthesize_profile_diff');
      expect(names).toContain('draft_proof_of_work_post');
      expect(names).toContain('generate_passive_visibility_plan');

      const callHandler = (server as any)._requestHandlers.get(
        CallToolRequestSchema.shape.method.value
      );
      expect(callHandler).toBeDefined();

      const callResult = await callHandler({
        method: 'tools/call',
        params: {
          name: 'humanize_content',
          arguments: { text: 'Delve into architecture.' },
        },
      });
      expect(callResult.isError).toBe(false);
      expect(callResult.content[0].text).toContain('investigate');
    });

    it('throws McpError on unknown tool name', async () => {
      const server = new Server(
        { name: 'test-server', version: '1.0.0' },
        { capabilities: { tools: {} } }
      );
      registerToolHandlers(server);

      const callHandler = (server as any)._requestHandlers.get(
        CallToolRequestSchema.shape.method.value
      );
      await expect(
        callHandler({
          method: 'tools/call',
          params: { name: 'non_existent_tool', arguments: {} },
        })
      ).rejects.toThrow('Unknown tool');
    });
  });
});

