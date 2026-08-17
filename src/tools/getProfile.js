import { getUserProfile } from "../linkedinClient.js";

export function register(server) {
  server.tool(
    "get_user_profile",
    "Fetches authenticated LinkedIn profile info (name, member ID)",
    {},
    async () => {
      try {
        const profile = await getUserProfile();
        return {
          content: [
            {
              type: "text",
              text: `Connected to LinkedIn.\nName: ${profile.name}\nProfile ID: ${profile.sub}`,
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to fetch profile: ${err.message}`,
            },
          ],
        };
      }
    }
  );
}
