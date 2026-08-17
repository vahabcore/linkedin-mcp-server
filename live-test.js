import dotenv from "dotenv";
dotenv.config();

import { createTextPost, deletePost, getUserProfile } from "./src/linkedinClient.js";

const POST_CONTENT = `Testing LinkedIn MCP Server integration. Automated verification post.`;

async function main() {
  try {
    console.log("Verifying LinkedIn credentials...");
    const profile = await getUserProfile();
    console.log(`Connected as: ${profile.name} (${profile.sub})\n`);

    console.log("Creating test post...");
    const post = await createTextPost(POST_CONTENT);
    const postId = post.id;
    console.log(`Post published: ${postId}\n`);

    console.log("Waiting 10 seconds before cleanup...");
    await new Promise((r) => setTimeout(r, 10000));

    console.log("Deleting test post...");
    await deletePost(postId);
    console.log(`Post deleted successfully.`);
  } catch (err) {
    console.error(`Verification error: ${err.message}`);
    process.exit(1);
  }
}

main();
