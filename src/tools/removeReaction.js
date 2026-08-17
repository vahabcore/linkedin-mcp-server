import { z } from "zod";
import { removeReaction } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "remove_reaction",
    "Removes your reaction from a LinkedIn post",
    {
      post_urn: z.string().min(1).describe("The URN of the post to remove your reaction from"),
    },
    async ({ post_urn }) => {
      try {
        await removeReaction(post_urn);
        return {
          content: [
            {
              type: "text",
              text: `Removed reaction from post ${post_urn}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to remove reaction: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
