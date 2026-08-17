import { z } from "zod";
import { replyToComment } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "reply_to_comment",
    "Replies to a specific comment on a LinkedIn post",
    {
      post_urn: z.string().min(1).describe("The URN of the post"),
      parent_comment_urn: z.string().min(1).describe("The URN of the parent comment to reply to"),
      reply_text: z.string().min(1).describe("The reply text"),
    },
    async ({ post_urn, parent_comment_urn, reply_text }) => {
      try {
        await replyToComment(post_urn, parent_comment_urn, reply_text);
        return {
          content: [
            {
              type: "text",
              text: `Reply posted on ${post_urn} to ${parent_comment_urn}: "${reply_text}"`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to reply: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
