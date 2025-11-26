# Cursor EOD MCP (Slack)

A simple MCP server that sends your end-of-day (EOD) updates to Slack.

## IDE Compatibility

This MCP server uses the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an open protocol that works with IDEs that support MCP. Currently supported:

- **Cursor** — Native MCP support
- **VS Code** — MCP support via [GitHub Copilot](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

The server is built on the standard MCP SDK and will work with any MCP-compatible client.

## What you need
- Node.js 18 or newer
- **Cursor** (with MCP enabled) or **VS Code** (with GitHub Copilot)
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

### Option 1: One-click install (Cursor only)

Click this link to automatically install the MCP server in Cursor:

<a href="cursor://anysphere.cursor-deeplink/mcp/install?name=@techhalo/cursor-eod-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkB0ZWNoaGFsby9jdXJzb3ItZW9kLW1jcCJdLCJlbnYiOnsiU0xBQ0tfQk9UX1RPS0VOIjoiIiwiU0xBQ0tfVVNFUl9UT0tFTiI6IiIsIlNMQUNLX0RFRkFVTFRfQ0hBTk5FTCI6IiJ9fQ==" target="_blank"><img src="https://github.com/SackeyDavid/cursor-eod-mcp/blob/dev/mcp-install-dark.png" alt="Add @techhalo/cursor-eod-mcp MCP server to Cursor" style="max-height:32px;" /></a>

If the button doesn't work, try copying and pasting this raw link: `cursor://anysphere.cursor-deeplink/mcp/install?name=@techhalo/cursor-eod-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkB0ZWNoaGFsby9jdXJzb3ItZW9kLW1jcCJdLCJlbnYiOnsiU0xBQ0tfQk9UX1RPS0VOIjoiIiwiU0xBQ0tfVVNFUl9UT0tFTiI6IiIsIlNMQUNLX0RFRkFVTFRfQ0hBTk5FTCI6IiJ9fQ==`

After installation, edit `~/.cursor/mcp.json` and fill in your Slack tokens in the `env` section (they're pre-configured as empty strings).

### Option 2: Manual setup (Cursor)

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
2. Restart Cursor so it picks up the server. Or toggle off and on the cursor-eod-mcp MCP Server from the Cursor "Tools & MCP" Settings page.
3. In Cursor chat, try:
```
list_channels
set_default_channel channel="frontend-team"
eod_status summary="• Did X\n• Reviewed Y\n• Shipped Z"
```
You should see the message appear in Slack.

### Option 3: VS Code setup

1. Open VS Code and ensure you have GitHub Copilot enabled
2. Edit `~/.vscode/mcp.json` (or create it if it doesn't exist) and add:
```json
{
  "servers": {
    "cursor-eod-mcp": {
      "type": "stdio",
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

**Note:** VS Code uses `servers` instead of `mcpServers` and requires `"type": "stdio"` for stdio-based servers. See the [VS Code MCP documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) for more details.

3. Restart VS Code or reload the window
4. Use the MCP tools in GitHub Copilot Chat

## Alternative setup (clone locally)
```bash
git clone https://github.com/SackeyDavid/cursor-eod-mcp.git
cd cursor-eod-mcp
npm install
npm run build
```

### For Cursor:
Point MCP to the built file in `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "cursor-eod-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/cursor-eod-mcp/dist/index.js"], // eg. /Users/Kofi/mcps/cursor-eod-mcp/dist/index.js
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_USER_TOKEN": "xoxp-your-user-token-or-empty",
        "SLACK_DEFAULT_CHANNEL": "frontend-team"
      } 
    }
  }
}
```

### For VS Code:
Point MCP to the built file in `~/.vscode/mcp.json`:
```json
{
  "servers": {
    "cursor-eod-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/cursor-eod-mcp/dist/index.js"], // eg. /Users/Kofi/mcps/cursor-eod-mcp/dist/index.js
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_USER_TOKEN": "xoxp-your-user-token-or-empty",
        "SLACK_DEFAULT_CHANNEL": "frontend-team"
      } 
    }
  }
}
```

Restart your IDE and test the same commands.

## Handy commands (run in Cursor chat or VS Code Copilot Chat)
- `configure slack_token="xoxb-..." default_channel="channel"` — save tokens/channel locally.
- `list_channels` — see channels your token can read.
- `set_default_channel channel="channel"` — set the default target.
- `preview_format` — see the message layout.
- `update_format_template template="*EOD ({date})*\n\n{summary}"` — change formatting.
- `eod_status` — send an EOD now. The MCP server automatically picks the default channel, auto-generates a summary from your Cursor workspace conversations, and sends the message.  
  Optional parameters: `summary="• Did X\n• Fixed Y"`, `pending="..."`, `planTomorrow="..."`, `channel="other-channel"`.

## Notes
- Bot token is enough to post; user token is only if you want your personal name/photo.
- Make sure the bot/user is a member of the target Slack channel.
- Tokens stay on your machine; never commit them.

## Troubleshooting
- Nothing posts: invite the bot/user to the channel (ie. for bot type /invite @EOD Bot); double-check tokens; restart your IDE.
- `invalid_auth`: token typo or wrong type (must start with `xoxb-` or `xoxp-/xoxs-`).
- “No channel specified”: set `SLACK_DEFAULT_CHANNEL` or run `set_default_channel`.
- **VS Code**: Make sure GitHub Copilot is enabled and the MCP server appears in the Copilot Chat tools list. Check the MCP output log if the server isn't starting.
