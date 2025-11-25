# EOD Status MCP Server

A Model Context Protocol (MCP) server for Cursor that posts end-of-day status updates to Slack channels.

## Features

- 🤖 **Auto-Summarization**: AI can summarize your day when you provide the summary (or wire your own source)
- 👥 **Multi-User Support**: Each workspace has isolated configuration
- 🎨 **Custom Format Templates**: Fully customizable message formats with Markdown support
- 📝 **Dynamic Channels**: Send updates to any Slack channel on the fly
- 🔐 **Manual tokens**: Quick start with bot/user tokens (no marketplace/OAuth flow required)

## Installation

### Prerequisites

- Node.js 18+ installed
- Cursor IDE with MCP support
- A Slack workspace where you can create apps

### Install the Server (manual tokens, not published to marketplace)

1) Clone/download:
```bash
git clone https://github.com/yourusername/halo-eod-mcp.git
cd halo-eod-mcp
npm install
npm run build
```

2) Get Slack tokens (manual method):
- Create a Slack app at https://api.slack.com/apps → “From scratch”.
- Add **Bot Token Scopes**: `chat:write`, `channels:read`, `groups:read`.
- (Optional, to post as you) add **User Token Scopes**: `chat:write`, `channels:read`, `groups:read`.
- Install/Reinstall to workspace; copy the Bot token (`xoxb-...`) and optional User token (`xoxp-...`/`xoxs-...`).

3) Wire Cursor MCP config (`~/.cursor/mcp.json`). Use absolute paths:
```json
{
  "mcpServers": {
    "halo-eod-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/halo-eod-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-bot-token",
        "SLACK_USER_TOKEN": "xoxp-your-user-token (optional, for name/photo)",
        "SLACK_DEFAULT_CHANNEL": "your-default-channel"
      }
    }
  }
}
```

4) Restart Cursor so it loads the server. Tokens stay local; do not commit them.

## Quick Start (manual tokens)

1) Configure tokens (one-time, manual)
- Via MCP config env (recommended), or
- Via `configure` in Cursor chat:
  ```
  configure slack_token="xoxb-your-bot-token" default_channel="your-channel"
  ```
  (Optional) provide `SLACK_USER_TOKEN` in env to post with your name/photo.

2) Set default channel (if not set):
```
set_default_channel channel="your-channel"
```

3) Send your first EOD:
```
eod_status summary="• Did X\n• Reviewed Y\n• Shipped Z"
```
- Optional: `pending="..."`, `planTomorrow="..."`, `channel="other-channel"`.

## Usage

### Basic Commands

**Send EOD status to a channel:**
```
eod_status halo
```

**Send to a different channel:**
```
eod_status engineering-team
```

**With manual summary:**
```
eod_status halo summary="Completed feature X, fixed bug Y"
```

### Configuration Tools

**List available Slack channels:**
```
list_channels
```

**Set default channel:**
```
set_default_channel general
```

**Update format template:**
```
update_format_template template="*EOD ({date})*\n\n{summary}"
```

**Preview format:**
```
preview_format
```

## Format Templates

Format templates support Markdown and variables. Available variables:

- `{date}` - Formatted date
- `{summary}` - Work summary
- `{pending}` - Pending items
- `{planTomorrow}` - Tomorrow's plan
- `{workspace}` - Workspace path
- `{project_name}` - Project name (custom)
- `{user_name}` - User name (custom)
- `{channel}` - Channel name

### Example Templates

**Default Template:**
```
*EOD Status ({date})*

{summary}

{pending}

{planTomorrow}
```

**Rich Format:**
```
🚀 *EOD Update - {date}*

*Project:* {project_name}
*Workspace:* {workspace}

*Summary:*
{summary}

*Pending:*
{pending}

*Tomorrow:*
{planTomorrow}

---
Posted by {user_name} to #{channel}
```

## Slack token setup (manual, not via marketplace)

1. Go to https://api.slack.com/apps → “Create New App” → “From scratch”.
2. Add Bot Token Scopes: `chat:write`, `channels:read`, `groups:read`.
3. (Optional, to post as you) add User Token Scopes: `chat:write`, `channels:read`, `groups:read`.
4. Install/Reinstall to workspace.
5. Copy tokens:
   - Bot token (`xoxb-...`) – required.
   - User token (`xoxp-/xoxs-...`) – optional, for name/photo identity.
6. Put tokens in MCP config env or run `configure slack_token="xoxb-..." default_channel="..."`.

## Architecture

- **Database**: SQLite database stores user configurations per workspace
- **Authentication**: Manual Slack tokens stored locally per workspace (no marketplace/OAuth flow needed)
- **Templates**: Customizable format templates with variable substitution
- **Auto-Summarization**: AI reviews workspace conversations and generates summaries

## Development

### Project Structure

```
src/
  ├── index.ts              # Main server entry point
  ├── auth/                 # Slack OAuth handling
  ├── config/               # Database & user config
  ├── tools/                # MCP tools
  │   ├── eodStatus.ts
  │   ├── configure.ts
  │   ├── channelManager.ts
  │   ├── formatManager.ts
  │   └── generateSummary.ts
  ├── utils/                # Template parsing & formatting
  └── slackClient.ts        # Slack Web API client
```

### Build

```bash
npm run build
```

### Database Location

User configurations are stored in `data/eod-mcp.db` (SQLite).

## Troubleshooting

**"Not configured" error:**
- Run the `configure` tool first to set up your Slack integration

**"No channel specified" error:**
- Provide a channel parameter: `eod_status channel-name`
- Or set a default channel: `set_default_channel channel-name`

**Token validation fails:**
- Make sure your token starts with `xoxb-` or `xoxp-`
- Verify the token hasn't expired
- Check that required scopes are added in Slack app settings

**Can't list channels:**
- Ensure `channels:read` and `groups:read` scopes are added
- Reinstall the app to your workspace

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

## License

ISC

## Links

- [GitHub Repository](https://github.com/yourusername/halo-eod-mcp)
- [Cursor Marketplace](https://cursor.directory)
- [Landing Page](https://yourusername.github.io/halo-eod-mcp)
