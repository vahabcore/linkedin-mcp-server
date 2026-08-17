import { z } from "zod";
import { deletePost } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "delete_post",
    "Deletes a post from your LinkedIn feed using its Post URN",
    {
      post_urn: z
        .string()
        .min(1)
        .describe("The full URN of the post to delete (e.g. 'urn:li:ugcPost:123456789')"),
    },
    async ({ post_urn }) => {
      try {
        const result = await deletePost(post_urn);
        return {
          content: [
            {
              type: "text",
              text: `Deleted post successfully. URN: ${result.deletedUrn}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to delete post: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
