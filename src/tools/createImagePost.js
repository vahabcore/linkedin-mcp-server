import { z } from "zod";
import {
  registerImageUpload,
  uploadImage,
  createImagePost,
} from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "create_image_post",
    "Publishes a LinkedIn post with an image downloaded from a URL",
    {
      content: z
        .string()
        .min(1)
        .describe("The text content to appear with the image"),
      image_url: z
        .string()
        .url()
        .describe("URL of the image to download and post"),
    },
    async ({ content, image_url }) => {
      try {
        const imageResponse = await fetch(image_url);
        if (!imageResponse.ok) {
          throw new Error(
            `Failed to download image from ${image_url}: ${imageResponse.status}`
          );
        }
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const { uploadUrl, asset } = await registerImageUpload();
        await uploadImage(uploadUrl, imageBuffer);
        const result = await createImagePost(content, asset);

        return {
          content: [
            {
              type: "text",
              text: `Published image post to LinkedIn. Post ID: ${result.id}\nImage source: ${image_url}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to publish image post: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
