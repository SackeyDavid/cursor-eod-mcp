# EOD Status MCP Server

A Model Context Protocol (MCP) server for Cursor that automatically summarizes your daily work and posts end-of-day status updates to Slack channels.

## Features

- 🤖 **Auto-Summarization**: AI automatically reviews all workspace conversations and generates concise bullet-point summaries
- 👥 **Multi-User Support**: Each workspace has isolated configuration
- 🎨 **Custom Format Templates**: Fully customizable message formats with Markdown support
- 📝 **Dynamic Channels**: Send updates to any Slack channel on the fly
- 🔐 **Secure**: OAuth-based Slack integration with per-user tokens

## Installation

### Prerequisites

- Node.js 18+ installed
- Cursor IDE with MCP support
- A Slack workspace where you can create apps

### Install the Server

1. Clone or download this repository:
```bash
git clone https://github.com/yourusername/halo-eod-mcp.git
cd halo-eod-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Set your Slack Bot Token as an environment variable:

```bash
export SLACK_BOT_TOKEN="xoxb-your-token-here"
```

Or optionally set a default channel:
```bash
export SLACK_DEFAULT_CHANNEL="general"
```

5. Add to your Cursor MCP configuration. Edit your Cursor MCP config file at `~/cursor/mcp.json`:

```json
{
  "mcpServers": {
    "halo-eod-mcp": {
      "command": "node",
      "args": ["/path/to/halo-eod-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

Replace `/path/to/halo-eod-mcp` with the actual path to this project.

**Note:** You can set the token either:
- In the MCP config's `env` section (as shown above)
- As a system environment variable (`export SLACK_BOT_TOKEN=...`)
- Using the `configure` tool (stores in JSON file)

6. Restart Cursor to load the MCP server.

## Quick Start

### 1. Configure Slack Integration

**Option A: Using Environment Variable (Recommended)**

Set the Slack Bot Token as an environment variable:

```bash
export SLACK_BOT_TOKEN="xoxb-your-token-here"
```

Or add it to your shell profile (`~/.zshrc`, `~/.bashrc`, etc.):
```bash
echo 'export SLACK_BOT_TOKEN="xoxb-your-token-here"' >> ~/.zshrc
```

**Option B: Using Configure Tool**

Alternatively, you can use the configure tool in Cursor:

```
configure slack_token="xoxb-your-token-here" default_channel="general"
```

**Getting Your Slack Token:**

1. Create a Slack app at https://api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `channels:read`, `groups:read`
3. Install the app to your workspace
4. Copy the Bot User OAuth Token (starts with `xoxb-`)

See [Slack OAuth Setup](#slack-oauth-setup) for detailed instructions.

### 2. Set Default Channel (Optional)

```
set_default_channel halo
```

### 3. Send Your First EOD Update

```
eod_status halo
```

The AI will automatically:
- Review all conversations in your workspace for today
- Generate a concise summary
- Format it using your template
- Post it to the specified Slack channel

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

## Slack OAuth Setup

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "EOD Status Bot")
4. Select your workspace
5. Navigate to "OAuth & Permissions" in the sidebar
6. Under "Scopes" → "Bot Token Scopes", add:
   - `chat:write` - Send messages
   - `channels:read` - Read public channels
   - `groups:read` - Read private channels
7. Scroll up and click "Install to Workspace"
8. Authorize the app
9. Copy the "Bot User OAuth Token" (starts with `xoxb-`)
10. Run `configure` in Cursor and paste the token

## Architecture

- **Database**: SQLite database stores user configurations per workspace
- **Authentication**: Slack OAuth tokens stored securely per user
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

