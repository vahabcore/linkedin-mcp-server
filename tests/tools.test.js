import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

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

import {
  createTextPost,
  createLinkPost,
  getUserProfile,
  deletePost,
  reactToPost,
  removeReaction,
  commentOnPost,
  deleteComment,
  replyToComment,
  registerImageUpload,
  uploadImage,
  createImagePost,
  createPollPost,
  getPostStats,
} from "../src/linkedinClient.js";

import { register as registerCreateTextPost } from "../src/tools/createTextPost.js";
import { register as registerCreateLinkPost } from "../src/tools/createLinkPost.js";
import { register as registerGetProfile } from "../src/tools/getProfile.js";
import { register as registerDeletePost } from "../src/tools/deletePost.js";
import { register as registerReactToPost } from "../src/tools/reactToPost.js";
import { register as registerRemoveReaction } from "../src/tools/removeReaction.js";
import { register as registerCommentOnPost } from "../src/tools/commentOnPost.js";
import { register as registerDeleteComment } from "../src/tools/deleteComment.js";
import { register as registerReplyToComment } from "../src/tools/replyToComment.js";
import { register as registerCreateImagePost } from "../src/tools/createImagePost.js";
import { register as registerCreatePollPost } from "../src/tools/createPollPost.js";
import { register as registerGetPostStats } from "../src/tools/getPostStats.js";

describe("MCP Tool Modules", () => {
  let server;

  beforeEach(() => {
    vi.restoreAllMocks();

    server = new McpServer({
      name: "test-linkedin-server",
      version: "1.0.0",
    });
  });

  describe("Tool Registration", () => {
    it("should register create_text_post tool without errors", () => {
      expect(() => registerCreateTextPost(server)).not.toThrow();
    });

    it("should register create_link_post tool without errors", () => {
      expect(() => registerCreateLinkPost(server)).not.toThrow();
    });

    it("should register get_user_profile tool without errors", () => {
      expect(() => registerGetProfile(server)).not.toThrow();
    });

    it("should register delete_post tool without errors", () => {
      expect(() => registerDeletePost(server)).not.toThrow();
    });

    it("should register all 4 original tools on a single server without conflicts", () => {
      expect(() => {
        registerCreateTextPost(server);
        registerCreateLinkPost(server);
        registerGetProfile(server);
        registerDeletePost(server);
      }).not.toThrow();
    });

    it("should register all 12 tools on a single server", () => {
      expect(() => {
        registerCreateTextPost(server);
        registerCreateLinkPost(server);
        registerGetProfile(server);
        registerDeletePost(server);
        registerReactToPost(server);
        registerRemoveReaction(server);
        registerCommentOnPost(server);
        registerDeleteComment(server);
        registerReplyToComment(server);
        registerCreateImagePost(server);
        registerCreatePollPost(server);
        registerGetPostStats(server);
      }).not.toThrow();
    });
  });

  describe("create_text_post handler", () => {
    it("should call createTextPost and return success content", async () => {
      createTextPost.mockResolvedValue({ id: "urn:li:ugcPost:111" });

      const toolSpy = vi.spyOn(server, "tool");
      registerCreateTextPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ content: "Hello from test!" });

      expect(createTextPost).toHaveBeenCalledWith("Hello from test!");
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("urn:li:ugcPost:111");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      createTextPost.mockRejectedValue(new Error("Token expired"));

      const toolSpy = vi.spyOn(server, "tool");
      registerCreateTextPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ content: "Will fail" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Token expired");
    });
  });

  describe("create_link_post handler", () => {
    it("should call createLinkPost with all parameters", async () => {
      createLinkPost.mockResolvedValue({ id: "urn:li:ugcPost:222" });

      const toolSpy = vi.spyOn(server, "tool");
      registerCreateLinkPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        content: "Check this out!",
        url: "https://example.com",
        title: "Example",
      });

      expect(createLinkPost).toHaveBeenCalledWith(
        "Check this out!",
        "https://example.com",
        "Example"
      );
      expect(result.content[0].text).toContain("urn:li:ugcPost:222");
      expect(result.content[0].text).toContain("https://example.com");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      createLinkPost.mockRejectedValue(new Error("Rate limited"));

      const toolSpy = vi.spyOn(server, "tool");
      registerCreateLinkPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        content: "x",
        url: "https://example.com",
        title: "x",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limited");
    });
  });

  describe("get_user_profile handler", () => {
    it("should return profile name and ID on success", async () => {
      getUserProfile.mockResolvedValue({
        sub: "testUser123",
        name: "Jane Smith",
        given_name: "Jane",
        family_name: "Smith",
      });

      const toolSpy = vi.spyOn(server, "tool");
      registerGetProfile(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({});

      expect(getUserProfile).toHaveBeenCalledOnce();
      expect(result.content[0].text).toContain("Jane Smith");
      expect(result.content[0].text).toContain("testUser123");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      getUserProfile.mockRejectedValue(new Error("Forbidden"));

      const toolSpy = vi.spyOn(server, "tool");
      registerGetProfile(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forbidden");
    });
  });

  describe("delete_post handler", () => {
    it("should call deletePost and return success content", async () => {
      deletePost.mockResolvedValue({
        success: true,
        deletedUrn: "urn:li:ugcPost:999",
      });

      const toolSpy = vi.spyOn(server, "tool");
      registerDeletePost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:ugcPost:999" });

      expect(deletePost).toHaveBeenCalledWith("urn:li:ugcPost:999");
      expect(result.content[0].text).toContain("urn:li:ugcPost:999");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      deletePost.mockRejectedValue(new Error("Post not found"));

      const toolSpy = vi.spyOn(server, "tool");
      registerDeletePost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:ugcPost:000" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Post not found");
    });
  });

  describe("react_to_post handler", () => {
    it("should call reactToPost and return success", async () => {
      reactToPost.mockResolvedValue({ success: true });

      const toolSpy = vi.spyOn(server, "tool");
      registerReactToPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:123", reaction_type: "LOVE" });

      expect(reactToPost).toHaveBeenCalledWith("urn:li:share:123", "LOVE");
      expect(result.content[0].text).toContain("LOVE");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      reactToPost.mockRejectedValue(new Error("Forbidden"));

      const toolSpy = vi.spyOn(server, "tool");
      registerReactToPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:123", reaction_type: "LIKE" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forbidden");
    });
  });

  describe("remove_reaction handler", () => {
    it("should call removeReaction and return success", async () => {
      removeReaction.mockResolvedValue({ success: true });

      const toolSpy = vi.spyOn(server, "tool");
      registerRemoveReaction(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:456" });

      expect(removeReaction).toHaveBeenCalledWith("urn:li:share:456");
      expect(result.isError).toBeUndefined();
    });
  });

  describe("comment_on_post handler", () => {
    it("should call commentOnPost and return success", async () => {
      commentOnPost.mockResolvedValue({ id: "comment-001" });

      const toolSpy = vi.spyOn(server, "tool");
      registerCommentOnPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:789", comment_text: "Nice!" });

      expect(commentOnPost).toHaveBeenCalledWith("urn:li:share:789", "Nice!");
      expect(result.content[0].text).toContain("Nice!");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      commentOnPost.mockRejectedValue(new Error("Rate limited"));

      const toolSpy = vi.spyOn(server, "tool");
      registerCommentOnPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:789", comment_text: "x" });
      expect(result.isError).toBe(true);
    });
  });

  describe("delete_comment handler", () => {
    it("should call deleteComment and return success", async () => {
      deleteComment.mockResolvedValue({ success: true });

      const toolSpy = vi.spyOn(server, "tool");
      registerDeleteComment(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:789", comment_id: "c001" });

      expect(deleteComment).toHaveBeenCalledWith("urn:li:share:789", "c001");
      expect(result.isError).toBeUndefined();
    });
  });

  describe("reply_to_comment handler", () => {
    it("should call replyToComment with all params", async () => {
      replyToComment.mockResolvedValue({ id: "reply-001" });

      const toolSpy = vi.spyOn(server, "tool");
      registerReplyToComment(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        post_urn: "urn:li:share:789",
        parent_comment_urn: "urn:li:comment:parent1",
        reply_text: "Thanks!",
      });

      expect(replyToComment).toHaveBeenCalledWith(
        "urn:li:share:789",
        "urn:li:comment:parent1",
        "Thanks!"
      );
      expect(result.content[0].text).toContain("Thanks!");
      expect(result.isError).toBeUndefined();
    });
  });

  describe("create_image_post handler", () => {
    it("should orchestrate download, register, upload, and post", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      );
      registerImageUpload.mockResolvedValue({
        uploadUrl: "https://upload.linkedin.com/xyz",
        asset: "urn:li:digitalmediaAsset:D123",
      });
      uploadImage.mockResolvedValue({ success: true });
      createImagePost.mockResolvedValue({ id: "urn:li:share:img1" });

      const toolSpy = vi.spyOn(server, "tool");
      registerCreateImagePost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        content: "Check this image!",
        image_url: "https://example.com/photo.jpg",
      });

      expect(registerImageUpload).toHaveBeenCalledOnce();
      expect(uploadImage).toHaveBeenCalledWith(
        "https://upload.linkedin.com/xyz",
        expect.any(Buffer)
      );
      expect(createImagePost).toHaveBeenCalledWith(
        "Check this image!",
        "urn:li:digitalmediaAsset:D123"
      );
      expect(result.content[0].text).toContain("urn:li:share:img1");
      expect(result.isError).toBeUndefined();
    });
  });

  describe("create_poll_post handler", () => {
    it("should call createPollPost with question, options, duration", async () => {
      createPollPost.mockResolvedValue({ id: "urn:li:share:poll1" });

      const toolSpy = vi.spyOn(server, "tool");
      registerCreatePollPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        question: "Favorite framework?",
        options: ["React", "Vue", "Angular"],
        duration: "ONE_WEEK",
      });

      expect(createPollPost).toHaveBeenCalledWith(
        "Favorite framework?",
        ["React", "Vue", "Angular"],
        "ONE_WEEK"
      );
      expect(result.content[0].text).toContain("urn:li:share:poll1");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      createPollPost.mockRejectedValue(new Error("Bad request"));

      const toolSpy = vi.spyOn(server, "tool");
      registerCreatePollPost(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({
        question: "Q?",
        options: ["A", "B"],
        duration: "ONE_DAY",
      });
      expect(result.isError).toBe(true);
    });
  });

  describe("get_post_stats handler", () => {
    it("should return formatted stats on success", async () => {
      getPostStats.mockResolvedValue({
        totalShareStatistics: { likeCount: 42, commentCount: 7, shareCount: 3 },
      });

      const toolSpy = vi.spyOn(server, "tool");
      registerGetPostStats(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:123" });

      expect(getPostStats).toHaveBeenCalledWith("urn:li:share:123");
      expect(result.content[0].text).toContain("42");
      expect(result.content[0].text).toContain("7");
      expect(result.content[0].text).toContain("3");
      expect(result.isError).toBeUndefined();
    });

    it("should return isError on failure", async () => {
      getPostStats.mockRejectedValue(new Error("Not found"));

      const toolSpy = vi.spyOn(server, "tool");
      registerGetPostStats(server);
      const handler = toolSpy.mock.calls[0][3];

      const result = await handler({ post_urn: "urn:li:share:999" });
      expect(result.isError).toBe(true);
    });
  });
});
