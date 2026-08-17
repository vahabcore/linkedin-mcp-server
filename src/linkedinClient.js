import dotenv from "dotenv";
dotenv.config();

const ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const AUTHOR_URN = process.env.LINKEDIN_AUTHOR_URN;

export function getHeaders() {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": "202503",
  };
}

export function normalizePostUrn(input, defaultType = "ugcPost") {
  if (!input) return "";
  const str = String(input).trim();
  const digitMatch = str.match(/\d{15,22}/);
  if (digitMatch) {
    return `urn:li:${defaultType}:${digitMatch[0]}`;
  }
  if (str.startsWith("urn:li:")) {
    if (str.startsWith("urn:li:activity:")) {
      return str.replace("urn:li:activity:", `urn:li:${defaultType}:`);
    }
    return str;
  }
  return `urn:li:${defaultType}:${str}`;
}

export async function createTextPost(content) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      author: AUTHOR_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function createLinkPost(content, url, title) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      author: AUTHOR_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "ARTICLE",
          media: [
            {
              status: "READY",
              originalUrl: url,
              title: { text: title },
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function getUserProfile() {
  const response = await fetch("https://api.linkedin.com/v2/userinfo", {
    method: "GET",
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function deletePost(postIdentifier) {
  if (!postIdentifier) {
    throw new Error("Post URN or ID is required");
  }

  const str = String(postIdentifier).trim();
  const digitMatch = str.match(/\d{15,22}/);
  const id = digitMatch ? digitMatch[0] : str.replace(/^urn:li:[^:]+:/, "");

  const candidateUrns = [
    `urn:li:ugcPost:${id}`,
    `urn:li:share:${id}`,
    str.startsWith("urn:li:") ? str : null,
  ].filter(Boolean);

  let success = false;
  let lastError = null;

  // 1. Delete share directly via /v2/shares/{id} (Removes feed activity card from profile)
  try {
    const shareRes = await fetch(`https://api.linkedin.com/v2/shares/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    if (shareRes.ok || shareRes.status === 204 || shareRes.status === 200) {
      success = true;
    }
  } catch (err) {
    lastError = err;
  }

  // 2. Delete UGC post / REST post across candidate URNs
  for (const urn of candidateUrns) {
    const encodedUrn = encodeURIComponent(urn);

    try {
      const response = await fetch(
        `https://api.linkedin.com/v2/ugcPosts/${encodedUrn}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (response.ok || response.status === 204 || response.status === 200) {
        success = true;
      } else if (!success) {
        lastError = new Error(`LinkedIn API error ${response.status}: ${await response.text()}`);
      }
    } catch (err) {
      if (!success) lastError = err;
    }

    try {
      const response = await fetch(
        `https://api.linkedin.com/rest/posts/${encodedUrn}`,
        {
          method: "DELETE",
          headers: getHeaders(),
        }
      );

      if (response.ok || response.status === 204 || response.status === 200) {
        success = true;
      }
    } catch {
      // Continue
    }
  }

  if (success) {
    return { success: true, deletedUrn: postIdentifier };
  }

  throw lastError || new Error(`Failed to delete post: ${postIdentifier}`);
}

export async function reactToPost(postUrn, reactionType) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const response = await fetch("https://api.linkedin.com/v2/reactions", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      root: normalizedUrn,
      reactionType,
      actor: AUTHOR_URN,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return { success: true, postUrn: normalizedUrn, reactionType };
}

export async function removeReaction(postUrn) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const actor = encodeURIComponent(AUTHOR_URN);
  const entity = encodeURIComponent(normalizedUrn);

  const response = await fetch(
    `https://api.linkedin.com/v2/reactions/(actor:${actor},entity:${entity})`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return { success: true, postUrn: normalizedUrn };
}

export async function commentOnPost(postUrn, commentText) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const encodedUrn = encodeURIComponent(normalizedUrn);
  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        actor: AUTHOR_URN,
        message: { text: commentText },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function deleteComment(postUrn, commentId) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const encodedUrn = encodeURIComponent(normalizedUrn);
  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments/${commentId}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return { success: true, postUrn: normalizedUrn, commentId };
}

export async function replyToComment(postUrn, parentCommentUrn, replyText) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const encodedUrn = encodeURIComponent(normalizedUrn);
  const response = await fetch(
    `https://api.linkedin.com/v2/socialActions/${encodedUrn}/comments`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        actor: AUTHOR_URN,
        message: { text: replyText },
        parentComment: parentCommentUrn,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function registerImageUpload() {
  const response = await fetch(
    "https://api.linkedin.com/v2/assets?action=registerUpload",
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        registerUploadRequest: {
          owner: AUTHOR_URN,
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          serviceRelationships: [
            {
              identifier: "urn:li:userGeneratedContent",
              relationshipType: "OWNER",
            },
          ],
          supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const uploadUrl =
    data.value.uploadMechanism[
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
    ].uploadUrl;
  const asset = data.value.asset;

  return { uploadUrl, asset };
}

export async function uploadImage(uploadUrl, imageData) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/octet-stream",
    },
    body: imageData,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn image upload error ${response.status}: ${errorBody}`);
  }

  return { success: true };
}

export async function createImagePost(content, assetUrn) {
  const response = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      author: AUTHOR_URN,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: content },
          shareMediaCategory: "IMAGE",
          media: [
            {
              status: "READY",
              media: assetUrn,
            },
          ],
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export async function createPollPost(question, options, duration) {
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      author: AUTHOR_URN,
      commentary: question,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      content: {
        poll: {
          question,
          options: options.map((text) => ({ text })),
          settings: {
            duration,
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  const postId = response.headers.get("x-restli-id");
  return { id: postId || "created" };
}

export async function getPostStats(postUrn) {
  const normalizedUrn = normalizePostUrn(postUrn, "ugcPost");
  const encodedUrn = encodeURIComponent(normalizedUrn);
  const response = await fetch(
    `https://api.linkedin.com/v2/socialMetadata/${encodedUrn}`,
    {
      method: "GET",
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`LinkedIn API error ${response.status}: ${errorBody}`);
  }

  return response.json();
}

export { AUTHOR_URN };
