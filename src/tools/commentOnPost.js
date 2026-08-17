import { z } from "zod";
import { commentOnPost } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "comment_on_post",
    "Adds a comment on a LinkedIn post",
    {
      post_urn: z.string().min(1).describe("The URN of the post to comment on"),
      comment_text: z.string().min(1).describe("The comment text to post"),
    },
    async ({ post_urn, comment_text }) => {
      try {
        const result = await commentOnPost(post_urn, comment_text);
        return {
          content: [
            {
              type: "text",
              text: `Comment posted on ${post_urn}: "${comment_text}"`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to comment: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
