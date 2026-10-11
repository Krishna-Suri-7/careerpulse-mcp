#!/usr/bin/env node
import dotenv from 'dotenv';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TOOL_REGISTRY, registerToolHandlers } from './handlers/tool-registry.js';
import { PROMPT_REGISTRY, registerPromptHandlers } from './handlers/prompt-registry.js';

// Load local environment variables
dotenv.config();

/**
 * Creates and configures the CareerPulse MCP Server with tools and prompts capabilities
 */
export function createCareerPulseServer(): Server {
  const server = new Server(
    {
      name: 'careerpulse-mcp',
      version: '2.1.0',
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    }
  );

  // Register all 6 tools defined in AGENTS.md + utility handlers
  registerToolHandlers(server);

  // Register all 4 preset prompts defined in AGENTS.md
  registerPromptHandlers(server);

  // Attach dictionaries for test inspector convenience
  (server as any)._registeredTools = TOOL_REGISTRY;
  (server as any)._registeredPrompts = PROMPT_REGISTRY;

  return server;
}

// Re-export alias for backwards compatibility
export const createIntelligenceServer = createCareerPulseServer;

/**
 * Starts the MCP Server over StdioServerTransport with graceful signal handling
 */
export async function startServer(): Promise<void> {
  const server = createCareerPulseServer();
  const transport = new StdioServerTransport();

  const handleShutdown = async (signal: string) => {
    try {
      await server.close();
      process.exit(0);
    } catch (err) {
      console.error(`Error during ${signal} graceful shutdown:`, err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  await server.connect(transport);
}

// Auto-start when executed directly in CLI
const isDirectCliExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.js') ||
    process.env.MCP_AUTO_START === 'true');

if (isDirectCliExecution && process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Fatal error starting CareerPulse MCP Server:', error);
    process.exit(1);
  });
}
