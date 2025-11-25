import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const webhookUrl = process.env.SLACK_WEBHOOK_URL;

if (!webhookUrl) {
  throw new Error("SLACK_WEBHOOK_URL is not set in environment");
}
const resolvedWebhookUrl = webhookUrl;

export async function postToSlack(text: string) {
  const res = await fetch(resolvedWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Slack webhook failed: ${res.status} ${body}`);
  }
}
