import { z } from "zod";
import { getPostStats } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "get_post_stats",
    "Gets engagement stats (likes, comments, shares) for a LinkedIn post",
    {
      post_urn: z.string().min(1).describe("The URN of the post to get stats for"),
    },
    async ({ post_urn }) => {
      try {
        const stats = await getPostStats(post_urn);

        const likeCount = stats.totalShareStatistics?.likeCount ?? stats.likeCount ?? 0;
        const commentCount = stats.totalShareStatistics?.commentCount ?? stats.commentCount ?? 0;
        const shareCount = stats.totalShareStatistics?.shareCount ?? stats.shareCount ?? 0;

        return {
          content: [
            {
              type: "text",
              text: `Post stats for ${post_urn}:\nLikes: ${likeCount}\nComments: ${commentCount}\nShares: ${shareCount}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to get post stats: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
