# Architectural Specification: CareerPulse MCP (Job Seeker Edition)

## Core Philosophy
Built specifically for quiet job seekers and developers who want maximum recruiter reach with minimal social media effort.
- 100% Local-First: Zero unauthorized scraping; all data stays on disk.
- Zero-Cringe Content: No influencer engagement loops. Posts are strictly "Proof of Work" (project learnings, architecture teardowns, technical milestone recaps).
- Protocol: Pure TypeScript MCP server over StdioServerTransport exposing both Tools and Interactive Prompts.

## Directory Layout
- `src/contracts/profile-schema.ts`: Zod schemas for candidate profiles, parsed experiences, and target jobs.
- `src/ingestion/pdf-extractor.ts`: Local LinkedIn PDF and resume text parser.
- `src/analytics/ats-engine.ts`: Multi-factor ATS scanner (metric density, action verbs, keyword saturation).
- `src/analytics/keyword-gap.ts`: n-gram comparison matching candidate text against target job descriptions.
- `src/visibility/proof-of-work.ts`: Generates high-signal, technical mini-posts from Git repos, commits, or project notes.
- `src/visibility/humanizer.ts`: Filters out AI buzzwords, performed sincerity, and LinkedIn "broetry" slop.
- `src/patching/diff-patcher.ts`: Visual Markdown patch generator for profile updates.
- `src/handlers/tool-registry.ts`: MCP tool definitions and execution mappings.
- `src/handlers/prompt-registry.ts`: 1-click MCP interactive prompt presets (`audit-my-profile`, `target-job-fit`, `write-proof-of-work`, `30-day-visibility-plan`).
- `src/server.ts`: Stdio server entrypoint with capabilities for both `tools` and `prompts`, plus graceful signal handling.
- `tests/unit/`: Dedicated Vitest suites testing engines and schema validations.

## Exposed MCP Tools
1. `ingest_profile`: Parses a local LinkedIn export PDF or resume JSON into the normalized Zod model.
2. `audit_job_readiness`: Calculates a 0-100 ATS readiness score with actionable metric-based fixes.
3. `analyze_role_fit`: Compares candidate profile against 1-3 target Job Descriptions to surface missing boolean search terms.
4. `synthesize_profile_diff`: Rewrites headline, summary, or bullets using the XYZ metric formula, returning clean Markdown diffs.
5. `draft_proof_of_work_post`: Takes a GitHub project link, commit summary, or technical takeaway and drafts a concise, high-signal post (under 180 words) to signal candidate activity to recruiters.
6. `generate_passive_visibility_plan`: Builds a minimal 30-day schedule requiring only 2 technical posts and 4 targeted comments to stay active in LinkedIn's candidate discovery algorithm.

## Exposed MCP Prompt Presets (User-Friendly Interface)
1. `audit-my-profile`: Orchestrates `ingest_profile` and `audit_job_readiness` to output an ATS score and top 3 bullet fixes.
2. `target-job-fit`: Prompts user for a target job description and runs `analyze_role_fit` for keyword gaps.
3. `write-proof-of-work`: Prompts user for a short technical summary and triggers `draft_proof_of_work_post` with anti-slop rules.
4. `30-day-visibility-plan`: Prompts user for target role and triggers `generate_passive_visibility_plan`.

## Engineering & DX Standards
- Environment: Node.js (v20+ LTS), TypeScript 5+ (ES2022, NodeNext resolution, strict mode: true).
- MCP Capabilities: Server instance must declare both `{ tools: {}, prompts: {} }`.
- Testing: Comprehensive unit test coverage for ATS scoring, keyword gap calculations, and prompt generation.