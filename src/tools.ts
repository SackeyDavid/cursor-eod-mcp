import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { postToSlack } from "./slackClient.js";

const sendEodArgsSchema = z.object({
  date: z.any().optional(),
  summary: z.any(),
  pending: z.any().optional(),
  planTomorrow: z.any().optional()
});

export function registerTools(server: McpServer) {
  server.registerTool(
    "eod_status",
    {
      title: "Send EOD status",
      description: "Send an end-of-day status update to the Halo Voice Slack channel",
      inputSchema: sendEodArgsSchema
    },
    async (rawArgs, _extra) => {
      const toText = (value: unknown) => {
        if (value === undefined || value === null) return null;
        const str = String(value).trim();
        return str.length ? str : null;
      };

      const toLines = (value: unknown) => {
        const base = toText(value);
        if (!base) return [];
        return base
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);
      };

      const summaryLines = toLines(rawArgs.summary);
      if (!summaryLines.length) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Summary is required to send the EOD status."
            }
          ]
        };
      }

      const formatDate = (value: unknown) => {
        const text = toText(value);
        const iso = text ?? new Date().toISOString().slice(0, 10);
        const parsed = new Date(iso);
        if (Number.isNaN(parsed.getTime())) return iso;
        return parsed.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
      };

  const pendingLines = toLines(rawArgs.pending);
  const planLines = toLines(rawArgs.planTomorrow);

  const parts: string[] = [];
  parts.push(`*Halo Voice – EOD Status (${formatDate(rawArgs.date)})*`);
  parts.push("");
  parts.push(...summaryLines.map((line) => `${line}`));

  if (pendingLines.length) {
    parts.push("");
    parts.push("Pending");
    parts.push(...pendingLines.map((line) => `${line}`));
  }

  if (planLines.length) {
    parts.push("");
    parts.push("Plan for Tomorrow");
    parts.push(...planLines.map((line) => `${line}`));
  }

      const text = parts.join("\n");

      await postToSlack(text);

      return {
        content: [
          {
            type: "text",
            text: "EOD status sent to Slack successfully."
          }
        ]
      };
    }
  );
}
