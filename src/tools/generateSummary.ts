import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const generateSummaryArgsSchema = z.object({
  date: z.string().optional().describe("Date to summarize conversations for (YYYY-MM-DD format, defaults to today)"),
});

export function registerGenerateSummaryTool(server: McpServer) {
  server.registerTool(
    "generate_eod_summary",
    {
      title: "Generate EOD Summary",
      description:
        "Generate a summary of all conversations in the workspace for a given day. This tool should be called to fetch conversation history and create a concise bullet-point summary of work done. The summary should include all conversations from the workspace for the specified date.",
      inputSchema: generateSummaryArgsSchema,
    },
    async (args) => {
      // This tool is primarily a signal to the AI to generate a summary
      // The actual summarization happens in the AI's context
      // We return instructions for the AI to follow

      const targetDate = args.date || new Date().toISOString().split("T")[0];
      
      return {
        content: [
          {
            type: "text",
            text: `Please review all conversations in this workspace for ${targetDate} and generate a concise bullet-point summary of:
- Work completed
- Issues resolved
- Features implemented
- Code changes made
- Any other significant activities

Format the summary as bullet points, one per line. Be concise but comprehensive, covering all conversations from the workspace for this date.`,
          },
        ],
      };
    }
  );
}

