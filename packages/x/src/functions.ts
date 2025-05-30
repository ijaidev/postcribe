import { xReadOnlyClient } from "./client";
import { TwitterApi } from "twitter-api-v2";
import * as fs from "fs";
import * as path from "path";

export interface MediaUploadResult {
  media_id: string;
  media_id_string: string;
  media_key?: string;
  size: number;
  expires_after_secs: number;
  image?: {
    image_type: string;
    w: number;
    h: number;
  };
  video?: {
    video_type: string;
  };
}

export interface TweetResult {
  data: {
    id: string;
    text: string;
  };
}

/**
 * Create an OAuth2 authenticated client for a specific user (v2 API)
 * @param accessToken - User's OAuth2 access token
 * @returns TwitterApi client instance for v2 operations
 */
export function createUserV2Client(accessToken: string): TwitterApi {
  return new TwitterApi(accessToken);
}

/**
 * Create an OAuth1.0a authenticated client for media uploads (v1.1 API only)
 * @param accessToken - User's OAuth access token
 * @param accessSecret - User's OAuth access token secret
 * @returns TwitterApi client instance for v1.1 operations (media upload)
 */
export function createUserV1Client(accessToken: string, accessSecret: string): TwitterApi {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY as string,
    appSecret: process.env.TWITTER_API_SECRET as string,
    accessToken,
    accessSecret,
  });
}

/**
 * Upload media to X (Twitter) using v1.1 API
 * @param filePath - Absolute path to the media file
 * @param accessToken - User's OAuth access token (for v1.1)
 * @param accessSecret - User's OAuth access token secret (for v1.1)
 * @param altText - Optional alt text for accessibility
 * @returns Promise with media upload result
 */
export async function uploadMedia(
  filePath: string,
  accessToken: string,
  accessSecret: string,
  altText?: string
): Promise<MediaUploadResult> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Create v1.1 client for media upload (requires OAuth 1.0a)
    const v1Client = createUserV1Client(accessToken, accessSecret);

    // Upload media using v1.1 API
    const mediaId = await v1Client.v1.uploadMedia(filePath);

    // Add alt text if provided
    if (altText) {
      await v1Client.v1.createMediaMetadata(mediaId, { alt_text: { text: altText } });
    }

    // Return the result in the expected format
    return {
      media_id: mediaId,
      media_id_string: mediaId,
      size: fs.statSync(filePath).size,
      expires_after_secs: 86400, // 24 hours default
    };
  } catch (error) {
    console.error("Error uploading media:", error);
    throw error;
  }
}

/**
 * Post a tweet to X (Twitter) using v2 API with OAuth2
 * @param text - Tweet text content
 * @param oauth2AccessToken - User's OAuth2 access token
 * @param options - Optional tweet options
 * @returns Promise with tweet result
 */
export async function postTweet(
  text: string,
  oauth2AccessToken: string,
  options?: {
    media_ids?: string[];
    poll?: {
      options: string[];
      duration_minutes: number;
    };
    reply?: {
      in_reply_to_tweet_id: string;
    };
    quote_tweet_id?: string;
  }
): Promise<TweetResult> {
  try {
    // Validate text length (X allows up to 280 characters)
    if (text.length > 280) {
      throw new Error("Tweet text exceeds 280 character limit");
    }

    // Create OAuth2 client for v2 API
    const v2Client = createUserV2Client(oauth2AccessToken);

    const tweetData: any = {
      text: text,
    };

    // Add media if provided
    if (options?.media_ids && options.media_ids.length > 0) {
      tweetData.media = {
        media_ids: options.media_ids,
      };
    }

    // Add poll if provided (note: polls and media are mutually exclusive)
    if (options?.poll) {
      tweetData.poll = {
        options: options.poll.options,
        duration_minutes: options.poll.duration_minutes,
      };
    }

    // Add reply if provided
    if (options?.reply) {
      tweetData.reply = {
        in_reply_to_tweet_id: options.reply.in_reply_to_tweet_id,
      };
    }

    // Add quote tweet if provided
    if (options?.quote_tweet_id) {
      tweetData.quote_tweet_id = options.quote_tweet_id;
    }

    // Post the tweet using v2 API
    const result = await v2Client.v2.tweet(tweetData);

    return {
      data: {
        id: result.data?.id || "",
        text: result.data?.text || "",
      },
    };
  } catch (error) {
    console.error("Error posting tweet:", error);
    throw error;
  }
}

/**
 * Get user's Twitter profile information using v2 API with OAuth2
 * @param oauth2AccessToken - User's OAuth2 access token
 * @returns Promise with user profile data
 */
export async function getUserProfile(oauth2AccessToken: string) {
  try {
    const v2Client = createUserV2Client(oauth2AccessToken);
    const user = await v2Client.v2.me({
      'user.fields': ['id', 'name', 'username', 'profile_image_url', 'public_metrics', 'description', 'verified']
    });
    return user.data;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Get user's tweets using v2 API with OAuth2
 * @param oauth2AccessToken - User's OAuth2 access token
 * @param userId - User ID (optional, defaults to authenticated user)
 * @returns Promise with user tweets
 */
export async function getUserTweets(oauth2AccessToken: string, userId?: string) {
  try {
    const v2Client = createUserV2Client(oauth2AccessToken);
    
    // Get user ID if not provided
    const targetUserId = userId || (await v2Client.v2.me()).data!.id;
    
    const tweets = await v2Client.v2.userTimeline(targetUserId, {
      'tweet.fields': ['id', 'text', 'created_at', 'public_metrics'],
      max_results: 10
    });
    
    return tweets.data;
  } catch (error) {
    console.error("Error getting user tweets:", error);
    throw error;
  }
}

// Legacy function names for backward compatibility
export const createUserClient = createUserV2Client; 