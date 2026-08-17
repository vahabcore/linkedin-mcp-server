import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { register as registerCreateTextPost } from "./src/tools/createTextPost.js";
import { register as registerCreateLinkPost } from "./src/tools/createLinkPost.js";
import { register as registerGetProfile } from "./src/tools/getProfile.js";
import { register as registerDeletePost } from "./src/tools/deletePost.js";
import { register as registerReactToPost } from "./src/tools/reactToPost.js";
import { register as registerRemoveReaction } from "./src/tools/removeReaction.js";
import { register as registerCommentOnPost } from "./src/tools/commentOnPost.js";
import { register as registerDeleteComment } from "./src/tools/deleteComment.js";
import { register as registerReplyToComment } from "./src/tools/replyToComment.js";
import { register as registerCreateImagePost } from "./src/tools/createImagePost.js";
import { register as registerCreatePollPost } from "./src/tools/createPollPost.js";
import { register as registerGetPostStats } from "./src/tools/getPostStats.js";

const app = express();
app.use(cors({ origin: "*" }));

app.use((req, res, next) => {
  if (req.query.sessionId) {
    return next();
  }
  express.json()(req, res, next);
});

function createConfiguredServer() {
  const mcp = new McpServer({
    name: "linkedin-mcp-server",
    version: "2.0.0",
  });

  registerCreateTextPost(mcp);
  registerCreateLinkPost(mcp);
  registerCreateImagePost(mcp);
  registerCreatePollPost(mcp);

  registerDeletePost(mcp);
  registerGetProfile(mcp);
  registerGetPostStats(mcp);

  registerReactToPost(mcp);
  registerRemoveReaction(mcp);
  registerCommentOnPost(mcp);
  registerDeleteComment(mcp);
  registerReplyToComment(mcp);

  return mcp;
}

const server = createConfiguredServer();

let bridgeClient = null;
async function getBridgeClient() {
  if (!bridgeClient) {
    const bridgeServer = createConfiguredServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "streamable-http-bridge", version: "2.0.0" }, { capabilities: {} });
    await bridgeServer.connect(serverTransport);
    await client.connect(clientTransport);
    bridgeClient = client;
  }
  return bridgeClient;
}

app.head(["/", "/mcp"], (req, res) => {
  res.status(200).end();
});

const transports = {};

app.get(["/", "/mcp"], async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post(["/messages", "/mcp", "/"], async (req, res) => {
  const sessionId = req.query.sessionId || req.headers["mcp-session-id"];
  const sseTransport = sessionId ? transports[sessionId] : null;

  if (sseTransport) {
    await sseTransport.handlePostMessage(req, res);
    return;
  }

  const { jsonrpc, id, method, params } = req.body || {};

  if (!method) {
    return res.status(400).json({
      error: "Invalid request",
      message: "No active session or valid JSON-RPC payload provided.",
    });
  }

  try {
    const client = await getBridgeClient();

    if (method === "initialize") {
      res.type("application/json");
      return res.json({
        jsonrpc: "2.0",
        id: id ?? 0,
        result: {
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
            resources: { listChanged: false },
            prompts: { listChanged: false },
          },
          serverInfo: {
            name: "linkedin-mcp-server",
            version: "2.0.0",
          },
        },
      });
    }

    if (method === "notifications/initialized" || method === "initialized" || !id) {
      return res.status(204).end();
    }

    if (method === "ping") {
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: {} });
    }

    if (method === "tools/list") {
      const toolsList = await client.listTools();
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: toolsList });
    }

    if (method === "tools/call") {
      const toolResult = await client.callTool({
        name: params?.name,
        arguments: params?.arguments || {},
      });
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: toolResult });
    }

    if (method === "resources/list") {
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: { resources: [] } });
    }

    if (method === "prompts/list") {
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: { prompts: [] } });
    }

    if (method === "resources/templates/list") {
      res.type("application/json");
      return res.json({ jsonrpc: "2.0", id: id ?? null, result: { resourceTemplates: [] } });
    }

    res.type("application/json");
    return res.status(404).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  } catch (err) {
    res.type("application/json");
    return res.status(500).json({
      jsonrpc: "2.0",
      id: id ?? null,
      error: { code: -32603, message: err.message },
    });
  }
});

const PORT = process.env.PORT || 3000;

const serverInstance = app.listen(PORT, () => {
  console.log(`LinkedIn MCP Server listening on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Messages endpoint: http://localhost:${PORT}/messages`);
});

export { app, server, transports, serverInstance };
