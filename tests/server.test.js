import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import http from "http";

vi.mock("dotenv", () => ({
  default: { config: vi.fn() },
}));

vi.mock("./src/linkedinClient.js", () => ({
  createTextPost: vi.fn(),
  createLinkPost: vi.fn(),
  getUserProfile: vi.fn(),
  deletePost: vi.fn(),
  reactToPost: vi.fn(),
  removeReaction: vi.fn(),
  commentOnPost: vi.fn(),
  deleteComment: vi.fn(),
  replyToComment: vi.fn(),
  registerImageUpload: vi.fn(),
  uploadImage: vi.fn(),
  createImagePost: vi.fn(),
  createPollPost: vi.fn(),
  getPostStats: vi.fn(),
}));

vi.mock("../src/linkedinClient.js", () => ({
  createTextPost: vi.fn(),
  createLinkPost: vi.fn(),
  getUserProfile: vi.fn(),
  deletePost: vi.fn(),
  reactToPost: vi.fn(),
  removeReaction: vi.fn(),
  commentOnPost: vi.fn(),
  deleteComment: vi.fn(),
  replyToComment: vi.fn(),
  registerImageUpload: vi.fn(),
  uploadImage: vi.fn(),
  createImagePost: vi.fn(),
  createPollPost: vi.fn(),
  getPostStats: vi.fn(),
}));

process.env.LINKEDIN_ACCESS_TOKEN = "test-token";
process.env.LINKEDIN_AUTHOR_URN = "urn:li:person:testUser";
process.env.PORT = "0";

import { getUserProfile } from "../src/linkedinClient.js";

const { app, serverInstance } = await import("./server.js");

let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    if (serverInstance.listening) {
      resolve();
    } else {
      serverInstance.on("listening", resolve);
    }
  });
  const address = serverInstance.address();
  baseUrl = `http://localhost:${address.port}`;
});

afterAll(async () => {
  await new Promise((resolve) => serverInstance.close(resolve));
});

describe("Server HTTP Routes", () => {
  describe("HEAD /", () => {
    it("should return 200 OK", async () => {
      const res = await fetch(`${baseUrl}/`, { method: "HEAD" });
      expect(res.status).toBe(200);
    });
  });

  describe("HEAD /mcp", () => {
    it("should return 200 OK", async () => {
      const res = await fetch(`${baseUrl}/mcp`, { method: "HEAD" });
      expect(res.status).toBe(200);
    });
  });

  describe("POST /messages (no session)", () => {
    it("should return 400 when no valid session exists", async () => {
      const res = await fetch(`${baseUrl}/messages?sessionId=non-existent-session-id`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "ping",
          id: 1,
        }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid request");
    });
  });

  describe("GET /mcp (SSE) + tools/list round-trip", () => {
    it("should open SSE stream, receive endpoint event, and list all 12 tools", async () => {
      const sseConnection = await new Promise((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for SSE endpoint")),
          5000
        );

        const url = new URL(`${baseUrl}/mcp`);

        const req = http.get(url, (res) => {
          expect(res.statusCode).toBe(200);
          expect(res.headers["content-type"]).toContain("text/event-stream");

          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();

            const lines = data.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const eventData = line.slice(6).trim();
                if (eventData.includes("sessionId=")) {
                  clearTimeout(timeout);
                  resolve({
                    messagesPath: eventData,
                    response: res,
                    request: req,
                  });
                  return;
                }
              }
            }
          });

          res.on("error", (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      });

      const { messagesPath, response: sseResponse } = sseConnection;
      const messagesUrl = `${baseUrl}${messagesPath}`;

      expect(messagesPath).toContain("sessionId=");

      try {
        await new Promise((r) => setTimeout(r, 100));

        const rpcResponse = await fetch(messagesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "tools/list",
            id: 42,
          }),
        });

        expect(rpcResponse.status).toBe(202);

        const toolListResult = await new Promise((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error("Timed out waiting for tools/list response")),
            5000
          );

          let sseData = "";
          sseResponse.on("data", (chunk) => {
            sseData += chunk.toString();

            const lines = sseData.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].startsWith("data: ")) {
                try {
                  const parsed = JSON.parse(lines[i].slice(6));
                  if (parsed.id === 42 && parsed.result?.tools) {
                    clearTimeout(timeout);
                    resolve(parsed.result.tools);
                    return;
                  }
                } catch {
                  // Not complete JSON yet
                }
              }
            }
          });
        });

        const toolNames = toolListResult.map((t) => t.name).sort();
        expect(toolNames).toEqual([
          "comment_on_post",
          "create_image_post",
          "create_link_post",
          "create_poll_post",
          "create_text_post",
          "delete_comment",
          "delete_post",
          "get_post_stats",
          "get_user_profile",
          "react_to_post",
          "remove_reaction",
          "reply_to_comment",
        ]);

        for (const tool of toolListResult) {
          expect(tool.description).toBeTruthy();
          expect(typeof tool.description).toBe("string");
        }

        const textPostTool = toolListResult.find((t) => t.name === "create_text_post");
        expect(textPostTool.inputSchema).toBeDefined();
        expect(textPostTool.inputSchema.properties.content).toBeDefined();

        const linkPostTool = toolListResult.find((t) => t.name === "create_link_post");
        expect(linkPostTool.inputSchema.properties.content).toBeDefined();
        expect(linkPostTool.inputSchema.properties.url).toBeDefined();
        expect(linkPostTool.inputSchema.properties.title).toBeDefined();

        const deletePostTool = toolListResult.find((t) => t.name === "delete_post");
        expect(deletePostTool.inputSchema.properties.post_urn).toBeDefined();

        const reactTool = toolListResult.find((t) => t.name === "react_to_post");
        expect(reactTool.inputSchema.properties.post_urn).toBeDefined();
        expect(reactTool.inputSchema.properties.reaction_type).toBeDefined();

        const pollTool = toolListResult.find((t) => t.name === "create_poll_post");
        expect(pollTool.inputSchema.properties.question).toBeDefined();
        expect(pollTool.inputSchema.properties.options).toBeDefined();
        expect(pollTool.inputSchema.properties.duration).toBeDefined();

        const imageTool = toolListResult.find((t) => t.name === "create_image_post");
        expect(imageTool.inputSchema.properties.content).toBeDefined();
        expect(imageTool.inputSchema.properties.image_url).toBeDefined();

        const profileTool = toolListResult.find((t) => t.name === "get_user_profile");
        expect(profileTool.inputSchema).toBeDefined();
      } finally {
        sseResponse.destroy();
      }
    });
  });

  describe("POST /mcp (Streamable HTTP JSON-RPC)", () => {
    it("should handle initialize request without prior SSE connection", async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "codex-test", version: "1.0.0" },
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.serverInfo.name).toBe("linkedin-mcp-server");
      expect(data.result.capabilities.tools).toBeDefined();
    });

    it("should list all 12 tools via POST /mcp", async () => {
      const res = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.tools).toHaveLength(12);
    });

    it("should execute get_user_profile tool via POST /mcp", async () => {
      getUserProfile.mockResolvedValue({
        sub: "user-123",
        name: "Test User",
      });

      const res = await fetch(`${baseUrl}/mcp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: {
            name: "get_user_profile",
            arguments: {},
          },
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.result.content[0].text).toContain("Test User");
    });
  });
});
