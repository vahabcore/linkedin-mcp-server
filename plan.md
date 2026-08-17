Here is the complete blueprint and implementation plan for building, expanding,
and deploying your Custom LinkedIn MCP Server for Gemini Spark.

🏗️ Master Plan: Custom LinkedIn MCP Server

┌───────────────────────────────────────────────────────────────────────────────────┐
│                                 GEMINI SPARK                                      │
│  • AI Content Generation  • Daily Scheduling  • Task Orchestration (Tool Caller)  │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │  MCP Protocol (JSON-RPC over SSE)
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      CUSTOM LINKEDIN MCP SERVER (on Railway)                      │
│                                                                                   │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌───────────────────┐  │
│  │    create_text_post     │  │    create_link_post     │  │  get_user_profile │  │
│  └─────────────────────────┘  └─────────────────────────┘  └───────────────────┘  │
│  ┌─────────────────────────┐  ┌─────────────────────────┐                         │
│  │       delete_post       │  │  create_poll_or_article │                         │
│  └─────────────────────────┘  └─────────────────────────┘                         │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │  Official LinkedIn REST API
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                              LINKEDIN PLATFORM                                    │
│                       (Personal Feed / Company Page)                              │
└───────────────────────────────────────────────────────────────────────────────────┘

1. Server Capabilities & Tools Inventory

These are the capabilities your MCP server can expose to Gemini Spark based on
your authorized scopes (openid, profile, w_member_social):

| Tool Name              | Purpose                                                                            | Input Parameters                                           | What Gemini Does                                                           |
| :--------------------- | :--------------------------------------------------------------------------------- | :--------------------------------------------------------- | :------------------------------------------------------------------------- |
| **`create_text_post`** | Publishes a standard text post (with hashtags & emojis) to your feed.              | `content` (string)                                         | Writes daily thoughts, tips, tech insights, or summaries and posts them.   |
| **`create_link_post`** | Publishes a post with a clickable preview card and thumbnail for an external link. | `content` (string),<br>`url` (string),<br>`title` (string) | Shares your blog posts, GitHub repos, or news articles.                    |
| **`get_user_profile`** | Checks your profile connection status and displays active name/ID.                 | *None*                                                     | Lets Gemini verify credentials and confirm whose account it is posting to. |
| **`delete_post`**      | Deletes a post from your LinkedIn feed using its Post URN.                         | `post_urn` (string)                                        | Allows Gemini to remove test posts or retract erroneous updates.           |

2. Project Directory Structure

Organizing the codebase cleanly for production on Railway:

linkedin-mcp-server/
├── package.json               # Dependencies & scripts
├── .env                       # Local secrets (ignored by git)
├── .gitignore                 # Exclude node_modules, .env
├── server.js                  # Express entry point & MCP SSE routes
└── src/
    ├── linkedinClient.js      # LinkedIn REST API helper functions
    └── tools/
        ├── createTextPost.js  # Tool: Text post
        ├── createLinkPost.js  # Tool: Link/Article post
        └── getProfile.js      # Tool: Profile inspection

3. Step-by-Step Execution Plan

Phase 1: Local Development & Multi-Tool Implementation

1.  Initialize the Node.js project with ES module support ("type": "module").
2.  Install core dependencies:
      - @modelcontextprotocol/sdk (Official MCP specification)
      - express & cors (HTTP & SSE transport handling)
      - zod (Input schema validation required by MCP)
      - dotenv (Environment variable management)
3.  Build the LinkedIn API service layer to handle:
      - Header generation (Authorization: Bearer <TOKEN>, versioning headers).
      - JSON payload formatting for LinkedIn's UGC post format.
      - Error handling (e.g., token expiration, duplicate posts, rate limits).
4.  Register the MCP Tools with clear descriptions so Gemini Spark knows exactly
    when and how to call them.

Phase 2: Protocol Handshake & Health Routing

Ensure the server passes all of Gemini Spark's connection requirements:

  - HEAD /mcp and HEAD /: Returns 200 OK for Gemini's connectivity check.
  - GET /mcp: Establishes the Server-Sent Events (SSE) stream for bidirectional
    communication.
  - POST /messages: Receives tool execution commands from Gemini and returns
    results.

Phase 3: Cloud Deployment on Railway

1.  Push to a Private GitHub Repository (ensuring .env is omitted).
2.  Link to Railway.app:
      - Deploy the service directly from GitHub.
      - Configure environment variables in Railway's dashboard:
          - LINKEDIN_ACCESS_TOKEN
          - LINKEDIN_AUTHOR_URN
      - Enable Railway's Public Networking to obtain a permanent HTTPS domain
        (https://<project-name>.up.railway.app).

Phase 4: Gemini Spark Integration & Automation

1.  Connect Custom App in Gemini Spark:
      - Go to Connected apps → Custom apps for Spark.
      - Enter: https://<your-railway-domain>.up.railway.app/mcp.
      - Gemini automatically scans the server and loads all registered tools.
2.  Create Task Instructions:
      - Prompt template defining tone, niche, length, hashtag preferences, and
        tool invocation instructions.
3.  Configure Daily Schedule:
      - Go to Schedules → select the task → set time (e.g., Daily at 9:30 AM
        IST).

4. Operational Maintenance & Token Lifecycle

  - 60-Day Token Refresh: LinkedIn user tokens remain valid for 60 days. Once
    every 2 months, you generate a fresh token and update the
    LINKEDIN_ACCESS_TOKEN variable in your Railway dashboard without needing to
    redeploy or rewrite any code.
