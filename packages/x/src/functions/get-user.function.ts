// import { logger } from "@repo/logger";
// import { createUserClient } from "../client";

// export interface UserDetails {
//   id: string;
//   username: string;
//   name: string;
//   profile_image_url?: string;
//   description?: string;
//   verified?: boolean;
//   public_metrics?: {
//     followers_count?: number;
//     following_count?: number;
//     tweet_count?: number;
//     listed_count?: number;
//   };
// }

// /**
//  * Get logged-in user's details using their access token
//  * @param accessToken - User's OAuth2 access token
//  * @returns Promise with user details
//  */

// export async function getUserDetails(accessToken: string): Promise<UserDetails> {
//   try {
//     // Create user-specific client with their access token
//     const userClient = createUserClient(accessToken);

//     const user = await userClient.v2.me({
//       "user.fields": [
//         "id",
//         "name",
//         "username",
//         "profile_image_url",
//         "public_metrics",
//         "description",
//         "verified"
//       ]
//     });

//     if (!user.data) {
//       throw new Error("No user data returned");
//     }

//     return {
//       id: user.data.id,
//       username: user.data.username,
//       name: user.data.name,
//       profile_image_url: user.data.profile_image_url,
//       description: user.data.description,
//       verified: user.data.verified,
//       public_metrics: user.data.public_metrics,
//     };
//   } catch (error) {
//     logger.error({ error }, "Error getting user details");
//     throw error;
//   }
// }
