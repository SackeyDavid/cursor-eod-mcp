import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const generateSummaryArgsSchema = z.object({
  date: z.string().optional().describe("Date to summarize conversations for (YYYY-MM-DD format, defaults to today)"),
});

export function registerGenerateSummaryTool(server: McpServer) {
  server.registerTool(
    "generate_eod_summary",
    {
      title: "Auto-Generate EOD Summary from All Conversations",
      description:
        "Automatically generate a comprehensive summary of all work done by reviewing ALL conversations in your Cursor workspace for a given day. This tool reviews all your conversations and creates a concise bullet-point summary of: work completed, issues resolved, features implemented, code changes, bugs fixed, tests written, documentation updates, and other significant activities. The summary covers all conversations from the workspace for the specified date (defaults to today).",
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
            text: `🔄 Auto-generating EOD summary from all conversations for ${targetDate}...\n\nPlease review ALL conversations in this Cursor workspace for ${targetDate} and generate a comprehensive bullet-point summary. The summary should include:\n\n• Work completed\n• Issues resolved\n• Features implemented\n• Code changes made\n• Bugs fixed\n• Tests written\n• Documentation updated\n• Code reviews completed\n• Deployments made\n• Any other significant activities\n\nFormat the summary as bullet points (one per line, starting with •). Be concise but comprehensive, covering ALL work-related activities from ALL conversations in the workspace for this date. Review every conversation to ensure nothing is missed.`,
          },
        ],
      };
    }
  );
}

