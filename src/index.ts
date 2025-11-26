#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerEodStatusTool } from "./tools/eodStatus.js";
import { registerConfigureTool } from "./tools/configure.js";
import { registerChannelManagerTools } from "./tools/channelManager.js";
import { registerFormatManagerTools } from "./tools/formatManager.js";
import { registerGenerateSummaryTool } from "./tools/generateSummary.js";

async function main() {
  const server = new McpServer({
    name: "cursor-eod-mcp",
    version: "1.0.1"
  });

  // Register all tools
  registerEodStatusTool(server);
  registerConfigureTool(server);
  registerChannelManagerTools(server);
  registerFormatManagerTools(server);
  registerGenerateSummaryTool(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});
