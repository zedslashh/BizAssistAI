import { WebClient } from "@slack/web-api";

const slack = new WebClient(process.env.SLACK_TOKEN);

export async function notifyAgent(orgId, query, userId) {
  await slack.chat.postMessage({
    channel: process.env.SLACK_CHANNEL,
    text: `⚠️ Low-confidence query from user ${userId} in org ${orgId}: "${query}"`
  });
}
