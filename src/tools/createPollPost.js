import { z } from "zod";
import { createPollPost } from "../linkedinClient.js";

const DURATIONS = ["ONE_DAY", "THREE_DAYS", "ONE_WEEK", "TWO_WEEKS"];

export function register(server) {
  server.tool(
    "create_poll_post",
    "Creates a LinkedIn poll with a question, options, and duration",
    {
      question: z.string().min(1).describe("The poll question"),
      options: z
        .array(z.string().min(1))
        .min(2)
        .max(4)
        .describe("2 to 4 answer options for the poll"),
      duration: z
        .enum(DURATIONS)
        .default("ONE_WEEK")
        .describe("How long the poll stays open (ONE_DAY, THREE_DAYS, ONE_WEEK, TWO_WEEKS)"),
    },
    async ({ question, options, duration }) => {
      try {
        const result = await createPollPost(question, options, duration);
        return {
          content: [
            {
              type: "text",
              text: `Created poll on LinkedIn. Post ID: ${result.id}\nQuestion: "${question}"\nOptions: ${options.join(", ")}\nDuration: ${duration}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to create poll: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
