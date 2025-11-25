# API Documentation

Complete reference for all MCP tools provided by the EOD Status MCP Server.

## Tools

### `eod_status`

Send an end-of-day status update to a Slack channel.

**Description**: Automatically generates a summary from workspace conversations if not provided, formats it using your template, and posts to Slack.

**Parameters**:
- `channel` (optional, string): Slack channel name or ID. Defaults to configured default channel.
- `date` (optional, string): Date in YYYY-MM-DD format. Defaults to today.
- `summary` (optional, string): Work summary. If not provided, AI auto-generates from workspace conversations.
- `pending` (optional, string): Pending items or blockers.
- `planTomorrow` (optional, string): Plan for tomorrow.

**Example**:
```
eod_status channel="halo" summary="Completed feature X"
```

**Returns**: Success message with channel name.

---

### `configure`

Set up Slack integration for the current workspace.

**Description**: Configure your Slack Bot Token and optionally set default channel and format template.

**Parameters**:
- `slack_token` (required, string): Slack Bot User OAuth Token (starts with `xoxb-`)
- `default_channel` (optional, string): Default Slack channel name or ID
- `format_template` (optional, string): Custom format template

**Example**:
```
configure slack_token="xoxb-..." default_channel="halo"
```

**Returns**: Configuration confirmation with workspace and team info.

---

### `list_channels`

List all available Slack channels.

**Description**: Fetches and displays all public and private channels accessible to your Slack bot.

**Parameters**: None

**Example**:
```
list_channels
```

**Returns**: List of channels with privacy indicators and default channel marker.

---

### `set_default_channel`

Set the default Slack channel for EOD updates.

**Description**: Updates your default channel configuration.

**Parameters**:
- `channel` (required, string): Channel name or ID to set as default

**Example**:
```
set_default_channel channel="general"
```

**Returns**: Confirmation message with new default channel.

---

### `update_format_template`

Update the format template for EOD status messages.

**Description**: Set a custom template with Markdown support and variables.

**Parameters**:
- `template` (required, string): Format template with variables

**Available Variables**:
- `{date}` - Formatted date
- `{summary}` - Work summary
- `{pending}` - Pending items
- `{planTomorrow}` - Tomorrow's plan
- `{workspace}` - Workspace path
- `{project_name}` - Project name
- `{user_name}` - User name
- `{channel}` - Channel name
- Custom variables you define

**Example**:
```
update_format_template template="*EOD ({date})*\n\n{summary}"
```

**Returns**: Confirmation with variables used.

---

### `preview_format`

Preview how your format template will render.

**Description**: Shows a preview of your template with sample data.

**Parameters**:
- `template` (optional, string): Template to preview. Uses current template if not provided.

**Example**:
```
preview_format
```

**Returns**: Formatted preview message with sample data.

---

### `generate_eod_summary`

Generate a summary from workspace conversations.

**Description**: Instructs the AI to review all workspace conversations for a date and generate a summary.

**Parameters**:
- `date` (optional, string): Date in YYYY-MM-DD format. Defaults to today.

**Example**:
```
generate_eod_summary date="2024-01-15"
```

**Returns**: Instructions for AI to generate summary.

**Note**: This tool is typically called automatically by the AI when `eod_status` is used without a summary parameter.

## Format Template Syntax

Templates support:

- **Markdown**: Bold (`*text*`), italic (`_text_`), code (`` `code` ``), lists, etc.
- **Variables**: `{variable_name}` format
- **Multi-line**: Use `\n` for line breaks

### Template Examples

**Simple**:
```
*EOD Status ({date})*

{summary}
```

**Rich**:
```
🚀 *EOD Update - {date}*

*Project:* {project_name}
*Summary:*
{summary}

*Pending:*
{pending}

*Tomorrow:*
{planTomorrow}
```

## Error Handling

All tools return structured error responses:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "Error message here"
    }
  ]
}
```

Common errors:
- `"Not configured"` - Run `configure` first
- `"No channel specified"` - Provide channel parameter or set default
- `"Token validation failed"` - Check your Slack token
- `"Failed to post to Slack"` - Check channel access and permissions

## Workspace Isolation

Each workspace has its own configuration stored in SQLite. The workspace is identified by:
1. `CURSOR_WORKSPACE_PATH` environment variable (if set)
2. `WORKSPACE_PATH` environment variable (if set)
3. Current working directory (fallback)

## Database Schema

User configurations are stored in `data/eod-mcp.db`:

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  workspace_path TEXT UNIQUE,
  slack_token TEXT,
  refresh_token TEXT,
  default_channel TEXT,
  format_template TEXT,
  created_at TEXT,
  updated_at TEXT
);
```

## Security Notes

- Slack tokens are stored in SQLite database (local file)
- Tokens are not encrypted by default (rely on file system permissions)
- Each workspace has isolated configuration
- Tokens should be kept secure and not shared

## Rate Limits

Slack API rate limits apply:
- Tier 2: 20 requests per minute
- Tier 3: 50+ requests per minute (for most operations)

The server doesn't implement rate limiting - it relies on Slack's rate limiting.

