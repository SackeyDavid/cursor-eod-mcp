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
            text: `🔄 Auto-generating EOD summary from all conversations for ${targetDate}...\n\nPlease review ALL conversations in this Cursor workspace for ${targetDate} and generate a concise, user-friendly bullet-point summary.\n\nIMPORTANT FORMATTING GUIDELINES:\n• Write each item as a simple action description (like a commit message, but without commit IDs or prefixes like "fix:", "feat:", "style:")\n• Focus on WHAT was done, not HOW it was implemented\n• Avoid technical implementation details (e.g., don't mention specific functions, hooks, lifecycle methods, or internal logic)\n• Keep descriptions concise and readable for non-technical stakeholders\n• Use plain language (e.g., "Add scroll-to-top button" instead of "Implemented scroll detection logic to show button when user scrolls near bottom")\n\nExamples of good format:\n• "Correct status mapping in CSR dashboard component"\n• "Update scroll-to-top button background color in conversation detail modal"\n• "Add scroll-to-top functionality in conversation detail modal"\n\nExamples to avoid:\n• "Implemented scroll detection logic to show button when user scrolls near bottom"\n• "Added proper cleanup of scroll listeners in ngOnDestroy"\n• "feat: Add scroll-to-top functionality (9985c1a)"\n\nFormat the summary as bullet points (one per line, starting with •). Cover ALL work-related activities from ALL conversations in the workspace for this date. Review every conversation to ensure nothing is missed.`,
          },
        ],
      };
    }
  );
}

