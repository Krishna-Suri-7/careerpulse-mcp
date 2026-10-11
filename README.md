# CareerPulse MCP

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-1.6.1-009688?logo=anthropic&logoColor=white)](https://modelcontextprotocol.io/)
[![Vitest](https://img.shields.io/badge/Vitest-3.0.7-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Coverage](https://img.shields.io/badge/Coverage-90.8%25-brightgreen.svg)]()
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local%20First-success.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Local-first LinkedIn career intelligence engine and low-effort recruiter visibility platform for quiet developers and technical job seekers.**

CareerPulse is a production-grade [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed for software engineers, data scientists, and technical practitioners who want high inbound recruiter reach without having to write performative social media "broetry", cringe humblebrags, or daily influencer threads.

---

## 📌 Table of Contents

- [The Core Problem](#-the-core-problem)
- [Key Features](#-key-features)
- [Technical Architecture (Controller-Engine-Adapter)](#-technical-architecture)
- [Project Structure](#-project-structure)
- [Exposed MCP Tools](#-exposed-mcp-tools)
- [1-Click Interactive Prompt Presets](#-1-click-interactive-prompt-presets)
- [Quickstart & MCP Setup](#-quickstart--mcp-setup)
  - [Claude Desktop Configuration](#claude-desktop-configuration)
  - [Cursor & Antigravity IDE Configuration](#cursor--antigravity-ide-configuration)
  - [Testing with MCP Inspector](#testing-with-mcp-inspector)
- [Testing & Verification](#-testing--verification)
- [Prior Art & Credits](#-prior-art--credits)
- [License](#-license)

---

## 🎯 The Core Problem

Technical hiring is broken on both ends of the funnel:

1. **The ATS & Recruiter Filter Black Box**:
   Applicant Tracking Systems (Greenhouse, Lever, Workday) and recruiter search strings filter candidates on keyword density and concrete accomplishments. Resumes filled with passive duties ("Responsible for maintaining microservices") get dropped before reaching human review. Candidates struggle to frame work using quantifiable impact formulas (e.g., Google XYZ: *Accomplished [X], as measured by [Y], by doing [Z]*).

2. **The 30-Day LinkedIn Recruiter Activity Decay**:
   Corporate recruiters using LinkedIn Recruiter rely heavily on the **"Spotlight: Engaged / Active in the past 30 days"** filter. Candidates matching this filter are ranked **up to 4x higher** in search results. However, most developers find typical LinkedIn content creation exhausting and superficial. When developers go silent for months while building code, their profile visibility decays dramatically.

3. **Account Safety & Privacy (Zero Scraping / Account Flags)**:
   Existing browser extensions and cloud scrapers log in with candidate credentials or scrape LinkedIn HTML in real time. This directly violates LinkedIn Terms of Service, triggers CAPTCHAs, and risks permanent account bans. 

### How CareerPulse Solves This

- **100% Local & Offline**: Operates strictly on standard LinkedIn profile export PDFs (downloaded via LinkedIn's built-in *"More → Save to PDF"* feature) or JSON/Markdown resumes. Zero network requests are sent to LinkedIn, requiring no cookies, passwords, or cloud syncing.
- **Deterministic ATS Scoring (0–100)**: Evaluates quantifiable metrics, action verb strength, and role density with mathematical precision.
- **Zero-Cringe Proof of Work (<180 Words)**: Translates real commits, bug post-mortems, and architecture trade-offs into high-credibility engineering posts that technical hiring managers appreciate.
- **Passive Visibility Roadmap**: Creates a structured 30-day schedule (2 technical posts and 4 targeted comments) that keeps the LinkedIn Recruiter "Active Talent" spotlight illuminated with **under 15 minutes of effort per week**.

---

## ⚡ Key Features

| Feature | Description | Engine / Module |
| :--- | :--- | :--- |
| **Local PDF & JSON Ingestion** | Section-aware parser extracting Experience, Education, and Skills from LinkedIn export PDFs or resume JSON into typed contracts. | `src/ingestion/pdf-extractor.ts` |
| **Quantifiable ATS Audit (0–100)** | Deterministic evaluation scoring profiles across Impact Metrics (40%), Action Verb Strength (30%), and Completeness & Density (30%). | `src/analytics/ats-engine.ts` |
| **Semantic Keyword Gap Analysis** | $O(n)$ n-gram tokenization and skill extraction comparing candidate experience against 1–3 target JDs, returning hard/soft gaps and recruiter boolean search strings. | `src/analytics/keyword-analyzer.ts` |
| **Google XYZ Bullet Patching** | Rewrites weak experience bullets into high-impact XYZ statements (*Accomplished [X], as measured by [Y], by doing [Z]*). | `src/patching/diff-patcher.ts` |
| **Unified Markdown Diffs** | Renders line-by-line and side-by-side Git-style markdown diffs showing exactly what changed between old and new profile copy. | `src/patching/diff-patcher.ts` |
| **Anti-Slop Humanizer** | Heuristic regex engine stripping 60+ AI clichés (*"delve"*, *"testament"*, *"supercharge"*, *"thrilled to announce"*), calibrating tone to authentic senior engineering voice. | `src/visibility/humanizer.ts` |
| **Proof-of-Work Generator** | Synthesizes technical notes or GitHub repositories into punchy LinkedIn posts under 180 words with zero humblebrags. | `src/visibility/proof-of-work.ts` |
| **30-Day Visibility Planner** | Generates a 4-week cadence of 2 technical posts and 4 technical discussion actions to maintain recruiter discovery rank. | `src/visibility/proof-of-work.ts` |

---

## 🏛️ Technical Architecture

CareerPulse is built following the **Controller-Engine-Adapter (CEA)** architectural pattern, enforcing strict separation of concerns, pure functional determinism, and protocol decoupling:

```mermaid
flowchart TD
    Client["MCP Client (Claude Desktop / Cursor / Antigravity)"]
    Client <-->|StdioServerTransport (JSON-RPC 2.0)| Server["Server Entrypoint (src/server.ts)"]

    subgraph "Controller Layer (Protocol Dispatch)"
        Server --> Tools["Tool Registry (tool-registry.ts)"]
        Server --> Prompts["Prompt Registry (prompt-registry.ts)"]
    end

    subgraph "Adapter Layer (I/O & Format Formatting)"
        Tools --> IngestAdapter["PDF / Resume Ingestion (pdf-extractor.ts)"]
        Tools --> DiffAdapter["Markdown Unified Diff Patcher (diff-patcher.ts)"]
    end

    subgraph "Engine Layer (Deterministic & Pure Analytics)"
        Tools --> AtsEngine["ATS Readiness Engine (ats-engine.ts)"]
        Tools --> GapEngine["Keyword & N-Gram Analyzer (keyword-analyzer.ts)"]
        Tools --> HumanEngine["Anti-Slop Humanizer (humanizer.ts)"]
        Tools --> PowEngine["Proof of Work Synthesizer (proof-of-work.ts)"]
    end

    subgraph "Contracts (Strict Runtime Typing)"
        IngestAdapter -.-> ZodSchemas["Profile & Domain Contracts (profile-schema.ts)"]
        DiffAdapter -.-> ZodSchemas
        AtsEngine -.-> ZodSchemas
        GapEngine -.-> ZodSchemas
        HumanEngine -.-> ZodSchemas
        PowEngine -.-> ZodSchemas
    end
```

### Architectural Pillars

1. **Contracts (`src/contracts/`)**:
   Defines the immutable domain data models via [Zod](https://zod.dev). Schemas strictly validate LinkedIn candidate profiles, experience entries, target job descriptions, patch operations, proof-of-work posts, and visibility plans at runtime.
2. **Controllers (`src/handlers/`)**:
   - `tool-registry.ts`: Typed dictionary dispatch mapping incoming MCP tool calls (`ListToolsRequestSchema`, `CallToolRequestSchema`) to underlying engines, wrapping outputs in standard `{ content: [{ type: 'text', text: ... }], isError }` envelopes.
   - `prompt-registry.ts`: Exposes 1-click interactive prompt presets via `ListPromptsRequestSchema` and `GetPromptRequestSchema`, generating structured LLM system prompts without requiring users to memorize CLI flags.
3. **Engines (`src/analytics/` & `src/visibility/`)**:
   Pure functional core algorithms without side effects:
   - `ats-engine.ts`: Pure functional scoring logic for metric presence, action verbs, and section completeness.
   - `keyword-analyzer.ts` & `keyword-gap.ts`: N-gram tokenizers and stopword filters computing frequency-based skill overlaps and recruiter boolean queries.
   - `humanizer.ts`: Cliché replacement rules and tone enforcement.
   - `proof-of-work.ts`: Generates structured technical narratives from commit summaries.
4. **Adapters (`src/ingestion/` & `src/patching/`)**:
   - `pdf-extractor.ts`: Wraps `pdf-parse` to convert messy PDF text streams into structured candidate profiles.
   - `diff-patcher.ts`: Unified diff formatter generating standard Git-style additions and deletions (`+` / `-`).
5. **Server Entrypoint (`src/server.ts`)**:
   Instantiates `@modelcontextprotocol/sdk` with `{ capabilities: { tools: {}, prompts: {} } }`, connects via `StdioServerTransport`, and configures clean `SIGINT` / `SIGTERM` teardown handlers.

---

## 📂 Project Structure

```text
careerpulse-mcp/
├── src/
│   ├── contracts/
│   │   └── profile-schema.ts        # Strict Zod schemas for candidate profile, JDs, patches, posts
│   ├── ingestion/
│   │   └── pdf-extractor.ts         # Section-aware parser for LinkedIn export PDFs and JSON
│   ├── analytics/
│   │   ├── ats-engine.ts            # Deterministic 0-100 ATS scanner (metrics, action verbs, density)
│   │   ├── keyword-analyzer.ts      # High-performance O(n) n-gram tokenization & boolean query engine
│   │   └── keyword-gap.ts           # Skill gap analyzer comparing candidate profile against JDs
│   ├── patching/
│   │   └── diff-patcher.ts          # Google XYZ synthesizer & Git-style unified Markdown diff generator
│   ├── visibility/
│   │   ├── humanizer.ts             # 60+ pattern anti-cliché engine stripping AI buzzwords
│   │   ├── proof-of-work.ts         # Technical post synthesizer & 30-day visibility scheduler
│   │   └── passive-visibility.ts    # Passive recruiter discovery cadence engine
│   ├── handlers/
│   │   ├── tool-registry.ts         # Typed dictionary dispatch mapping MCP tools to domain engines
│   │   └── prompt-registry.ts       # 1-Click interactive prompt presets (audit, fit, post, plan)
│   ├── server.ts                    # StdioServerTransport initialization & signal handling
│   └── index.ts                     # Root library export
├── scripts/
│   └── demo.ts                      # Terminal CLI demo script demonstrating all core modules
├── tests/
│   ├── unit/                        # Dedicated Vitest unit test suites (>90% test coverage)
│   │   ├── ats-engine.test.ts
│   │   ├── keyword-analyzer.test.ts
│   │   ├── keyword-gap.test.ts
│   │   ├── pdf-extractor.test.ts
│   │   ├── diff-patcher.test.ts
│   │   ├── humanizer.test.ts
│   │   ├── prompt-registry.test.ts
│   │   ├── tool-registry.test.ts
│   │   └── server.test.ts
│   └── testUtils.ts                 # Synthetic PDF fixtures and mock builders
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## 🛠️ Exposed MCP Tools

CareerPulse exposes 6 core tools alongside dedicated utility and bridge helpers:

| Tool Name | Description | Key Parameters |
| :--- | :--- | :--- |
| `ingest_profile` | Parses a local LinkedIn export PDF or resume JSON into the normalized Zod model. | `filePath`, `base64`, `rawText`, `format` |
| `audit_job_readiness` | Evaluates profile against ATS heuristics, generating a 0–100 score and specific metric/verb fixes. | `profile` |
| `analyze_role_fit` | Compares profile against 1–3 target JDs to surface hard/soft skill gaps and recruiter boolean queries. | `profile`, `targetJobDescription`, `targetRoleTitle` |
| `synthesize_profile_diff` | Rewrites headline, summary, or bullets using the Google XYZ formula and returns unified Markdown diffs. | `profile`, `section`, `targetRole`, `metrics`, `focusKeywords` |
| `draft_proof_of_work_post` | Transforms commit notes or technical trade-offs into a concise LinkedIn post under 180 words. | `technicalNotes`, `type`, `githubUrl`, `metrics` |
| `generate_passive_visibility_plan` | Builds a 30-day schedule (2 technical posts + 4 comments) to activate recruiter discovery filters. | `targetRole`, `primaryTechStack`, `cadenceDays` |
| `humanize_content` | Strips predictable AI clichés (*"delve"*, *"testament"*, *"supercharge"*) from engineering text. | `text`, `targetAudience` |
| `synthesize_section_patch` | Target-specific section rewriter applying XYZ metric formulas to Headline, About, or Experiences. | `section`, `currentContent`, `metrics`, `keywords` |
| `render_change_diff` | Produces unified or side-by-side Markdown diffs for any proposed text revisions. | `originalText`, `proposedText`, `format` |
| `get_workflow_preset` | Fallback bridge tool allowing clients lacking native MCP Prompt UI to trigger guided workflows. | `workflow` |

---

## ✨ 1-Click Interactive Prompt Presets

CareerPulse implements the **MCP Prompt Registry** protocol (`prompts/list` and `prompts/get`), providing 1-click guided presets. Non-technical users can run full end-to-end career workflows without memorizing tool arguments:

| Prompt Preset | Purpose | Guided Workflow Steps |
| :--- | :--- | :--- |
| `audit-my-profile` | Complete ATS & Impact Audit | 1. Ingests candidate profile from PDF or text.<br>2. Calculates 0–100 ATS score across metrics and action verbs.<br>3. Identifies the 3 weakest bullet points.<br>4. Rewrites them using the Google XYZ formula and returns a Markdown diff. |
| `target-job-fit` | Role Fit & Keyword Gap Analysis | 1. Compares candidate profile against target job description.<br>2. Calculates match percentage and flags missing technical competencies.<br>3. Builds an exact boolean search string used by technical recruiters. |
| `write-proof-of-work` | Zero-Slop Technical Post | 1. Takes architecture notes, bug post-mortems, or commit summaries.<br>2. Formats into a high-credibility post under 180 words.<br>3. Applies the anti-slop engine to eliminate AI clichés. |
| `30-day-visibility-plan` | Passive Recruiter Discovery Plan | 1. Analyzes target role and tech stack.<br>2. Produces a 4-week calendar with 2 technical posts and 4 targeted comments.<br>3. Targets the LinkedIn Recruiter 30-day active filter with <15 mins/week. |

> *Tip*: If your MCP client does not yet render native Prompt menus, trigger the same workflows using the `get_workflow_preset` tool.

---

## 🚀 Quickstart & MCP Setup

### Prerequisites

- **Node.js**: `v18.0.0` or higher (`node -v`)
- **npm**: `v9.0.0` or higher (`npm -v`)

### 1. Installation & Build

Clone and compile the server locally:

```bash
git clone https://github.com/<your-username>/careerpulse-mcp.git
cd careerpulse-mcp
npm install
npm run build
```

This compiles the TypeScript source from `src/` to ES Module JavaScript in `dist/`.

---

### Claude Desktop Configuration

Configure Claude Desktop to connect to CareerPulse via StdioServerTransport:

1. Open your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   *(If using the Windows Microsoft Store package of Claude Desktop, the path is `%LOCALAPPDATA%\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\claude_desktop_config.json`)*

2. Add `careerpulse` under `mcpServers`:

#### Windows Configuration
```json
{
  "mcpServers": {
    "careerpulse": {
      "command": "node",
      "args": [
        "C:\\Users\\<YourUsername>\\path\\to\\careerpulse-mcp\\dist\\server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

#### macOS / Linux Configuration
```json
{
  "mcpServers": {
    "careerpulse": {
      "command": "node",
      "args": [
        "/Users/<YourUsername>/path/to/careerpulse-mcp/dist/server.js"
      ],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

3. Restart Claude Desktop. You will see the hammer/tools icon indicating the CareerPulse tools are registered and ready.

---

### Cursor & Antigravity IDE Configuration

Add CareerPulse to your IDE MCP configuration:

- **Server Name**: `careerpulse`
- **Transport Type**: `command` (stdio)
- **Command**: `node /absolute/path/to/careerpulse-mcp/dist/server.js`

---

### Testing with MCP Inspector

Test and inspect the MCP server interactively via the official graphical browser inspector:

```bash
npx @modelcontextprotocol/inspector node dist/server.js
```

Open `http://localhost:5173` in your browser to view all registered tools, schemas, and live JSON responses.

---

## 🧪 Testing & Verification

CareerPulse maintains comprehensive automated test suites verifying all domain algorithms, contracts, and error handlers:

```bash
# Run all unit tests
npm test

# Run tests with V8 code coverage report
npm run test:coverage

# Verify strict TypeScript type checking without emitting files
npx tsc --noEmit

# Run the interactive CLI terminal demo
npm run demo
```

### Test Suite Results

```text
✓ tests/unit/ats-engine.test.ts (13 tests)
✓ tests/unit/keyword-gap.test.ts (2 tests)
✓ tests/unit/keyword-analyzer.test.ts (10 tests)
✓ tests/unit/contracts.test.ts (9 tests)
✓ tests/schemas.test.ts (17 tests)
✓ tests/tools/rewriteSection.test.ts (4 tests)
✓ tests/unit/visibility.test.ts (7 tests)
✓ tests/tools/auditProfile.test.ts (3 tests)
✓ tests/tools/keywordGapAnalysis.test.ts (3 tests)
✓ tests/unit/prompt-registry.test.ts (9 tests)
✓ tests/unit/pdf-extractor.test.ts (11 tests)
✓ tests/tools/parse_profile_pdf.test.ts (3 tests)
✓ tests/parsers.test.ts (10 tests)
✓ tests/unit/server.test.ts (2 tests)
✓ tests/unit/diff-patcher.test.ts (6 tests)
✓ tests/unit/tool-registry.test.ts (15 tests)
✓ tests/tools/exportProfileDiff.test.ts (3 tests)
✓ tests/index.test.ts (1 test)

Test Files  18 passed (18)
     Tests  128 passed (128)
  Coverage  >90% statements covered
```

---

## 💡 Prior Art & Credits

CareerPulse stands on the shoulders of the open-source MCP and developer community. We formally acknowledge and credit the following prior art:

- [**jcnh74/linkedin-profile-manager-mcp**](https://github.com/jcnh74/linkedin-profile-manager-mcp): Architectural inspiration for local-first MCP profile management and offline data handling without external network leakage.
- [**sergebulaev/linkedin-skills**](https://github.com/sergebulaev/linkedin-skills): Foundational inspiration for recruiter skill extraction heuristics, high-signal career prompt patterns, and anti-slop principles, refactored and formalized here into deterministic TypeScript engines and Zod contracts for technical candidates.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

```text
MIT License

Copyright (c) 2025 CareerPulse Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
