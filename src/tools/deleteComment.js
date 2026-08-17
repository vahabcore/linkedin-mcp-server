import { z } from "zod";
import { deleteComment } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "delete_comment",
    "Deletes a comment you made on a LinkedIn post",
    {
      post_urn: z.string().min(1).describe("The URN of the post the comment belongs to"),
      comment_id: z.string().min(1).describe("The ID of the comment to delete"),
    },
    async ({ post_urn, comment_id }) => {
      try {
        await deleteComment(post_urn, comment_id);
        return {
          content: [
            {
              type: "text",
              text: `Deleted comment ${comment_id} from ${post_urn}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to delete comment: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
