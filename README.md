
https://github.com/user-attachments/assets/9a68e67b-2702-4abe-9599-cbedb28c57a8
# LinkedIn MCP Server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![MCP Version](https://img.shields.io/badge/MCP-2024--11--05-orange.svg)](https://modelcontextprotocol.io)
[![Tests](https://img.shields.io/badge/tests-62%20passed-success.svg)]()

A production-ready [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server connecting AI agents (Google Gemini Spark, OpenAI Codex, Claude Desktop, Cursor, Windsurf) to the official **LinkedIn REST API**.

Enables AI agents to autonomously draft and publish text updates, share rich link previews, upload images, create interactive polls, manage existing posts, and engage with reactions and threaded comments.

https://github.com/user-attachments/assets/cda965be-d6a2-4a37-8d3c-29a68a9959e1

---

## Features

- **Dual-Mode MCP Transport**:
  - **Server-Sent Events (SSE)** via `GET /mcp` and `POST /messages` for clients like Google Gemini Spark and Claude.
  - **Streamable HTTP** via `POST /mcp` for modern command-line and agent runtimes like OpenAI Codex (`rmcp`).
- **12 Comprehensive Tools**:
  - **Content Creation**: Text updates, article link preview cards, binary image uploads (3-step pipeline), and multi-option polls.
  - **Content Management**: Delete posts by URN, fetch engagement statistics (likes, comments, shares), and verify account profile connections.
  - **Social Engagement**: Add reactions (`LIKE`, `CELEBRATE`, `LOVE`, `INSIGHTFUL`, `FUNNY`, `EMPATHY`), delete reactions, add comments, reply in threads, and remove comments.
- **Robust Validation**: Powered by Zod schemas for all tool input parameters.
- **Enterprise-Ready**: Automated unit and integration test suite with 100% endpoint coverage.

---

## Tool Reference

| Tool | Category | Description | Parameters |
|------|----------|-------------|------------|
| `create_text_post` | Content | Publish a standard text post to your LinkedIn feed | `content` (string, required) |
| `create_link_post` | Content | Publish a post with a clickable preview card | `content` (string), `url` (string, URL), `title` (string) |
| `create_image_post` | Content | Download an image from a URL, upload it to LinkedIn, and publish | `content` (string), `image_url` (string, URL) |
| `create_poll_post` | Content | Create a poll with customizable duration | `question` (string), `options` (string array, 2-4 items), `duration` (`ONE_DAY`, `THREE_DAYS`, `ONE_WEEK`, `TWO_WEEKS`) |
| `delete_post` | Management | Delete a post using its Post URN | `post_urn` (string, e.g. `urn:li:ugcPost:...`) |
| `get_user_profile` | Management | Retrieve authenticated profile details (name, member ID) | *None* |
| `get_post_stats` | Management | Fetch engagement metrics (likes, comments, shares) | `post_urn` (string) |
| `react_to_post` | Engagement | Add a reaction to a post | `post_urn` (string), `reaction_type` (`LIKE`, `CELEBRATE`, `LOVE`, `INSIGHTFUL`, `FUNNY`, `EMPATHY`) |
| `remove_reaction` | Engagement | Remove your reaction from a post | `post_urn` (string) |
| `comment_on_post` | Engagement | Add a top-level comment on a post | `post_urn` (string), `comment_text` (string) |
| `delete_comment` | Engagement | Delete a comment you made | `post_urn` (string), `comment_id` (string) |
| `reply_to_comment` | Engagement | Post a threaded reply to an existing comment | `post_urn` (string), `parent_comment_urn` (string), `reply_text` (string) |

---

## Setup & Authentication

### 1. LinkedIn Developer Portal Setup

1. Create a LinkedIn application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
2. Under the **Products** tab, request access to:
   - **Share on LinkedIn** (provides `w_member_social` permission)
   - **Sign In with LinkedIn using OpenID Connect** (provides `openid` and `profile` permissions)
3. In the **Auth** tab, add a redirect URL (e.g. `https://httpbin.org/get` or your domain).

### 2. Generate a User Access Token

1. Construct the authorization URL in your browser:
   ```
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&scope=openid%20profile%20w_member_social
   ```
2. Authorize the application and copy the `code` query parameter from the redirection URL.
3. Exchange the code for a 60-day access token:
   ```bash
   curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
     -d "grant_type=authorization_code" \
     -d "code=YOUR_AUTHORIZATION_CODE" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI"
   ```
4. Fetch your member ID:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.linkedin.com/v2/userinfo
   ```
   The `sub` field is your member identifier (e.g., `urn:li:person:<sub_id>`).

---

## Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

Configure your `.env` variables:

```env
LINKEDIN_ACCESS_TOKEN=your_oauth2_access_token
LINKEDIN_AUTHOR_URN=urn:li:person:your_member_sub_id
PORT=3000
```

---

## Running Locally

```bash
# Install dependencies
npm install

# Run unit and integration tests
npm test

# Start the server
npm start

# Start in development mode (with live reload)
npm run dev
```

---

## Client Integration

### OpenAI Codex CLI

Add the server using the Codex CLI:

```bash
codex mcp add linkedin --url https://your-server-domain.com/mcp
```

Or add it directly to `~/.codex/config.toml`:

```toml
[mcp_servers.linkedin]
url = "https://your-server-domain.com/mcp"
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "node",
      "args": ["/path/to/linkedin-mcp-server/server.js"],
      "env": {
        "LINKEDIN_ACCESS_TOKEN": "your_access_token",
        "LINKEDIN_AUTHOR_URN": "urn:li:person:your_sub_id"
      }
    }
  }
}
```

### Google Gemini Spark

In your Gemini Spark custom applications settings, enter your public SSE endpoint URL:
```
https://your-server-domain.com/mcp
```

---

## Deployment

### Deploy to Railway

1. Install the Railway CLI: `npm i -g @railway/cli`
2. Link or create a project:
   ```bash
   railway init
   railway up
   ```
3. Set environment variables:
   ```bash
   railway variable set LINKEDIN_ACCESS_TOKEN="your_token" LINKEDIN_AUTHOR_URN="urn:li:person:your_sub_id"
   ```
4. Generate a public domain:
   ```bash
   railway domain
   ```

---

## Development & Testing

The test suite includes 62 automated unit and integration tests covering the LinkedIn API client, all 12 tool registrations and execution handlers, and SSE / Streamable HTTP transports.

```bash
# Run tests once
npm test

# Run tests in watch mode
npm run test:watch
```

---

## License

This project is licensed under the [MIT License](LICENSE).
