import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("dotenv", () => ({
  default: { config: vi.fn() },
}));

process.env.LINKEDIN_ACCESS_TOKEN = "test-token-abc123";
process.env.LINKEDIN_AUTHOR_URN = "urn:li:person:testUser123";

const {
  getHeaders,
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
} = await import("../src/linkedinClient.js");

describe("linkedinClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getHeaders()", () => {
    it("should return Authorization header with Bearer token", () => {
      const headers = getHeaders();
      expect(headers.Authorization).toBe("Bearer test-token-abc123");
    });

    it("should include Content-Type as application/json", () => {
      const headers = getHeaders();
      expect(headers["Content-Type"]).toBe("application/json");
    });

    it("should include X-Restli-Protocol-Version header", () => {
      const headers = getHeaders();
      expect(headers["X-Restli-Protocol-Version"]).toBe("2.0.0");
    });

    it("should include LinkedIn-Version header", () => {
      const headers = getHeaders();
      expect(headers["LinkedIn-Version"]).toBe("202405");
    });
  });

  describe("createTextPost()", () => {
    it("should send correct UGC payload and return post ID", async () => {
      const mockResponse = { id: "urn:li:ugcPost:111222333" };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await createTextPost("Hello LinkedIn!");

      expect(fetch).toHaveBeenCalledOnce();
      expect(fetch).toHaveBeenCalledWith(
        "https://api.linkedin.com/v2/ugcPosts",
        expect.objectContaining({
          method: "POST",
          body: expect.any(String),
        })
      );

      const callArgs = fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.author).toBe("urn:li:person:testUser123");
      expect(body.lifecycleState).toBe("PUBLISHED");
      expect(
        body.specificContent["com.linkedin.ugc.ShareContent"].shareCommentary
          .text
      ).toBe("Hello LinkedIn!");
      expect(
        body.specificContent["com.linkedin.ugc.ShareContent"].shareMediaCategory
      ).toBe("NONE");

      expect(result).toEqual(mockResponse);
    });

    it("should throw on API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized - token expired"),
        })
      );

      await expect(createTextPost("test")).rejects.toThrow(
        "LinkedIn API error 401: Unauthorized - token expired"
      );
    });

    it("should throw on network failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("Network error"))
      );

      await expect(createTextPost("test")).rejects.toThrow("Network error");
    });
  });

  describe("createLinkPost()", () => {
    it("should include media URL and title in the payload", async () => {
      const mockResponse = { id: "urn:li:ugcPost:444555666" };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        })
      );

      const result = await createLinkPost(
        "Check out my blog!",
        "https://example.com/blog",
        "My Awesome Blog"
      );

      const callArgs = fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const shareContent =
        body.specificContent["com.linkedin.ugc.ShareContent"];

      expect(shareContent.shareMediaCategory).toBe("ARTICLE");
      expect(shareContent.media).toHaveLength(1);
      expect(shareContent.media[0].originalUrl).toBe(
        "https://example.com/blog"
      );
      expect(shareContent.media[0].title.text).toBe("My Awesome Blog");
      expect(shareContent.media[0].status).toBe("READY");

      expect(result).toEqual(mockResponse);
    });

    it("should throw on API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: () => Promise.resolve("Rate limit exceeded"),
        })
      );

      await expect(
        createLinkPost("test", "https://example.com", "Title")
      ).rejects.toThrow("LinkedIn API error 429: Rate limit exceeded");
    });
  });

  describe("getUserProfile()", () => {
    it("should call /v2/userinfo and return profile data", async () => {
      const mockProfile = {
        sub: "aywD42vlW9",
        name: "John Doe",
        given_name: "John",
        family_name: "Doe",
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockProfile),
        })
      );

      const result = await getUserProfile();

      expect(fetch).toHaveBeenCalledWith(
        "https://api.linkedin.com/v2/userinfo",
        expect.objectContaining({ method: "GET" })
      );
      expect(result.name).toBe("John Doe");
      expect(result.given_name).toBe("John");
      expect(result.sub).toBe("aywD42vlW9");
    });

    it("should throw on API error response", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          text: () => Promise.resolve("Insufficient permissions"),
        })
      );

      await expect(getUserProfile()).rejects.toThrow(
        "LinkedIn API error 403: Insufficient permissions"
      );
    });
  });

  describe("deletePost()", () => {
    it("should send DELETE to the correct encoded endpoint", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      const urn = "urn:li:ugcPost:123456789";
      const result = await deletePost(urn);

      expect(fetch).toHaveBeenCalledWith(
        `https://api.linkedin.com/v2/ugcPosts/${encodeURIComponent(urn)}`,
        expect.objectContaining({ method: "DELETE" })
      );
      expect(result).toEqual({ success: true, deletedUrn: urn });
    });

    it("should throw when post is not found (404)", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          text: () => Promise.resolve("Post not found"),
        })
      );

      await expect(deletePost("urn:li:ugcPost:999")).rejects.toThrow(
        "LinkedIn API error 404: Post not found"
      );
    });

    it("should throw when post is already deleted", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: false,
          status: 410,
          text: () => Promise.resolve("Resource already deleted"),
        })
      );

      await expect(deletePost("urn:li:ugcPost:000")).rejects.toThrow(
        "LinkedIn API error 410: Resource already deleted"
      );
    });
  });

  describe("reactToPost()", () => {
    it("should send correct reaction payload", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      );

      const result = await reactToPost("urn:li:share:123", "LIKE");

      const callArgs = fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.root).toBe("urn:li:share:123");
      expect(body.reactionType).toBe("LIKE");
      expect(body.actor).toBe("urn:li:person:testUser123");
      expect(result).toEqual({ success: true, postUrn: "urn:li:share:123", reactionType: "LIKE" });
    });

    it("should throw on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve("Forbidden") })
      );
      await expect(reactToPost("urn:li:share:123", "LIKE")).rejects.toThrow("LinkedIn API error 403");
    });
  });

  describe("removeReaction()", () => {
    it("should send DELETE to the correct compound key URL", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await removeReaction("urn:li:share:456");

      expect(fetch).toHaveBeenCalledOnce();
      const url = fetch.mock.calls[0][0];
      expect(url).toContain("/v2/reactions/");
      expect(url).toContain("actor:");
      expect(url).toContain("entity:");
      expect(fetch.mock.calls[0][1].method).toBe("DELETE");
      expect(result).toEqual({ success: true, postUrn: "urn:li:share:456" });
    });
  });

  describe("commentOnPost()", () => {
    it("should send comment to the socialActions endpoint", async () => {
      const mockComment = { id: "comment-001" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockComment) })
      );

      const result = await commentOnPost("urn:li:share:789", "Great post!");

      const callArgs = fetch.mock.calls[0];
      expect(callArgs[0]).toContain("/socialActions/");
      expect(callArgs[0]).toContain("/comments");
      const body = JSON.parse(callArgs[1].body);
      expect(body.message.text).toBe("Great post!");
      expect(body.actor).toBe("urn:li:person:testUser123");
      expect(result).toEqual(mockComment);
    });

    it("should throw on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 422, text: () => Promise.resolve("Invalid") })
      );
      await expect(commentOnPost("urn:li:share:789", "test")).rejects.toThrow("LinkedIn API error 422");
    });
  });

  describe("deleteComment()", () => {
    it("should send DELETE to the correct comment endpoint", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const result = await deleteComment("urn:li:share:789", "comment-001");

      const url = fetch.mock.calls[0][0];
      expect(url).toContain("/comments/comment-001");
      expect(fetch.mock.calls[0][1].method).toBe("DELETE");
      expect(result).toEqual({ success: true, postUrn: "urn:li:share:789", commentId: "comment-001" });
    });
  });

  describe("replyToComment()", () => {
    it("should include parentComment in the payload", async () => {
      const mockReply = { id: "reply-001" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockReply) })
      );

      const result = await replyToComment("urn:li:share:789", "urn:li:comment:parent1", "Thanks!");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.parentComment).toBe("urn:li:comment:parent1");
      expect(body.message.text).toBe("Thanks!");
      expect(result).toEqual(mockReply);
    });
  });

  describe("registerImageUpload()", () => {
    it("should return uploadUrl and asset URN", async () => {
      const mockResponse = {
        value: {
          uploadMechanism: {
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
              uploadUrl: "https://upload.linkedin.com/xyz",
            },
          },
          asset: "urn:li:digitalmediaAsset:D123",
        },
      };

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockResponse) })
      );

      const result = await registerImageUpload();

      expect(result.uploadUrl).toBe("https://upload.linkedin.com/xyz");
      expect(result.asset).toBe("urn:li:digitalmediaAsset:D123");
      expect(fetch.mock.calls[0][0]).toContain("registerUpload");
    });
  });

  describe("uploadImage()", () => {
    it("should PUT binary data to the upload URL", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true })
      );

      const fakeBuffer = Buffer.from("fake-image-data");
      const result = await uploadImage("https://upload.linkedin.com/xyz", fakeBuffer);

      expect(fetch).toHaveBeenCalledWith(
        "https://upload.linkedin.com/xyz",
        expect.objectContaining({
          method: "PUT",
          body: fakeBuffer,
        })
      );
      expect(result).toEqual({ success: true });
    });

    it("should throw on upload failure", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("Server error") })
      );
      await expect(uploadImage("https://x.com", Buffer.from(""))).rejects.toThrow("LinkedIn image upload error 500");
    });
  });

  describe("createImagePost()", () => {
    it("should include IMAGE media category and asset URN", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: "urn:li:share:img1" }) })
      );

      const result = await createImagePost("Check this out!", "urn:li:digitalmediaAsset:D123");

      const body = JSON.parse(fetch.mock.calls[0][1].body);
      const shareContent = body.specificContent["com.linkedin.ugc.ShareContent"];
      expect(shareContent.shareMediaCategory).toBe("IMAGE");
      expect(shareContent.media[0].media).toBe("urn:li:digitalmediaAsset:D123");
      expect(result.id).toBe("urn:li:share:img1");
    });
  });

  describe("createPollPost()", () => {
    it("should send poll payload to /rest/posts", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          headers: { get: () => "urn:li:share:poll1" },
        })
      );

      const result = await createPollPost(
        "What's your favorite language?",
        ["JavaScript", "Python", "Go"],
        "ONE_WEEK"
      );

      const url = fetch.mock.calls[0][0];
      expect(url).toBe("https://api.linkedin.com/rest/posts");
      const body = JSON.parse(fetch.mock.calls[0][1].body);
      expect(body.content.poll.question).toBe("What's your favorite language?");
      expect(body.content.poll.options).toHaveLength(3);
      expect(body.content.poll.settings.duration).toBe("ONE_WEEK");
      expect(result.id).toBe("urn:li:share:poll1");
    });

    it("should throw on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve("Bad request") })
      );
      await expect(createPollPost("Q?", ["A", "B"], "ONE_DAY")).rejects.toThrow("LinkedIn API error 400");
    });
  });

  describe("getPostStats()", () => {
    it("should call socialMetadata endpoint and return stats", async () => {
      const mockStats = { likeCount: 42, commentCount: 7, shareCount: 3 };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockStats) })
      );

      const result = await getPostStats("urn:li:share:123");

      const url = fetch.mock.calls[0][0];
      expect(url).toContain("/socialMetadata/");
      expect(fetch.mock.calls[0][1].method).toBe("GET");
      expect(result).toEqual(mockStats);
    });

    it("should throw on API error", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve("Not found") })
      );
      await expect(getPostStats("urn:li:share:999")).rejects.toThrow("LinkedIn API error 404");
    });
  });
});
