import { z } from "zod";
import { createLinkPost } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "create_link_post",
    "Publishes a LinkedIn post with a link preview card",
    {
      content: z
        .string()
        .min(1)
        .describe("Commentary text to appear above the link card"),
      url: z
        .string()
        .url()
        .describe("The external URL to share"),
      title: z
        .string()
        .min(1)
        .describe("Title shown on the link preview card"),
    },
    async ({ content, url, title }) => {
      try {
        const result = await createLinkPost(content, url, title);
        return {
          content: [
            {
              type: "text",
              text: `Published link post to LinkedIn. Post ID: ${result.id}\nShared URL: ${url}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to publish link post: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
