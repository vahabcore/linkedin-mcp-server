import { z } from "zod";
import { reactToPost } from "../linkedinClient.js";

const REACTION_TYPES = ["LIKE", "CELEBRATE", "LOVE", "INSIGHTFUL", "FUNNY", "EMPATHY"];

export function register(server) {
  server.tool(
    "react_to_post",
    "Adds a reaction to a LinkedIn post (LIKE, CELEBRATE, LOVE, INSIGHTFUL, FUNNY, or EMPATHY)",
    {
      post_urn: z.string().min(1).describe("The URN of the post to react to"),
      reaction_type: z.enum(REACTION_TYPES).describe("The type of reaction to add"),
    },
    async ({ post_urn, reaction_type }) => {
      try {
        await reactToPost(post_urn, reaction_type);
        return {
          content: [
            {
              type: "text",
              text: `Added ${reaction_type} reaction on post ${post_urn}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to add reaction: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
