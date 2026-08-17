import { z } from "zod";
import { createTextPost } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "create_text_post",
    "Publishes a text post to LinkedIn",
    {
      content: z
        .string()
        .min(1)
        .describe("The text content to publish as a LinkedIn post"),
    },
    async ({ content }) => {
      try {
        const result = await createTextPost(content);
        return {
          content: [
            {
              type: "text",
              text: `Published text post to LinkedIn. Post ID: ${result.id}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to publish text post: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
