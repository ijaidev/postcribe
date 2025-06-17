// import { logger } from "@repo/logger";
// import { createUserClient } from "../client";

// /**
//  * Get current user's tweets using twitter-api-v2
//  * @param accessToken - User's OAuth2 access token
//  * @returns Promise with user tweets
//  */
// export async function getUserTweets(accessToken: string) {
//   try {
//     // Create user-specific client
//     const userClient = createUserClient(accessToken);

//     // Get current user's ID first
//     const currentUser = await userClient.v2.me();

//     if (!currentUser.data?.id) {
//       throw new Error("Could not get current user information");
//     }

//     // Get current user's tweets
//     const tweets = await userClient.v2.userTimeline(currentUser.data.id, {
//       "tweet.fields": ["id", "text", "created_at", "public_metrics"],
//       max_results: 20,
//     });

//     return tweets.data;
//   } catch (error) {
//     logger.error({ error }, "Error getting user tweets");
//     throw error;
//   }
// }
