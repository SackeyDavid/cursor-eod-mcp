# Cursor EOD MCP (Slack)

A simple MCP server for Cursor that sends your end-of-day (EOD) updates to Slack.

## What you need
- Node.js 18 or newer
- Cursor installed (MCP enabled)
- A Slack workspace where you can create an app
- Slack tokens:
  - Bot token (starts with `xoxb-`) — required to post
  - User token (starts with `xoxp-` or `xoxs-`) — optional, use if you want your own name/photo on messages

## How to get your Slack tokens (step by step)
1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**. You can call it EOD Bot. Ensure you are signed in to the desired Slack Workspace you want to post messages to.
2. In the left menu, click **OAuth & Permissions**.
3. Under **Bot Token Scopes**, add: `chat:write`, `channels:read`, `groups:read`.
4. (Optional, for posting as you) under **User Token Scopes**, add: `chat:write`, `channels:read`, `groups:read`.
5. Scroll up and click **Install to {Workspace}** (or **Reinstall**) and approve. You may need to repeat clicking the Install to {Workspace} button until you see the changes saved.
6. Copy your tokens:
   - Bot token: looks like `xoxb-...` (required).
   - User token: looks like `xoxp-...` or `xoxs-...` (optional, for your identity).

Keep tokens private. Do **not** commit them to Git.

## Quick setup (no cloning, use npx)
1. Edit `~/.cursor/mcp.json` and add:
```json
{
  "mcpServers": {
    "@techhalo/cursor-eod-mcp": {
      "command": "npx",
      "args": ["-y", "@techhalo/cursor-eod-mcp"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_USER_TOKEN": "xoxp-your-user-token-or-empty",
        "SLACK_DEFAULT_CHANNEL": "halo"
      }
    }
  }
}
```
2. Restart Cursor so it picks up the server. Or toggle off and on the cursor-eod-mcp MCP Server from the "Tools & MCP" Settings page.
3. In Cursor chat, try:
```
list_channels
set_default_channel channel="frontend-team"
eod_status summary="• Did X\n• Reviewed Y\n• Shipped Z"
```
You should see the message appear in Slack.

## Alternative setup (clone locally)
```bash
git clone https://github.com/SackeyDavid/cursor-eod-mcp.git
cd cursor-eod-mcp
npm install
npm run build
```
Then point MCP to the built file:
```json
{
  "command": "node",
  "args": ["/absolute/path/to/cursor-eod-mcp/dist/index.js"],
  "env": {
    "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
    "SLACK_USER_TOKEN": "xoxp-your-user-token-or-empty",
    "SLACK_DEFAULT_CHANNEL": "frontend-team"
  }
}
```
Restart Cursor and test the same commands.

## Handy commands (run in Cursor chat)
- `configure slack_token="xoxb-..." default_channel="channel"` — save tokens/channel locally.
- `list_channels` — see channels your token can read.
- `set_default_channel channel="channel"` — set the default target.
- `preview_format` — see the message layout.
- `update_format_template template="*EOD ({date})*\n\n{summary}"` — change formatting.
- `eod_status summary="• Did X\n• Fixed Y"` — send an EOD now.  
  Optional: `pending="..."`, `planTomorrow="..."`, `channel="other-channel"`.

## Notes
- Bot token is enough to post; user token is only if you want your personal name/photo.
- Make sure the bot/user is a member of the target Slack channel.
- Tokens stay on your machine; never commit them.

## Troubleshooting
- Nothing posts: invite the bot/user to the channel (ie. /invite @EOD Bot); double-check tokens; restart Cursor.
- `invalid_auth`: token typo or wrong type (must start with `xoxb-` or `xoxp-/xoxs-`).
- “No channel specified”: set `SLACK_DEFAULT_CHANNEL` or run `set_default_channel`.
