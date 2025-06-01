import type { SendTweetV2Params } from "twitter-api-v2";
import { createUserClient } from "../client";

export interface TweetResult {
    data: {
        id: string;
        text: string;
    };
}

interface PostTweetOptions {
    text: string;
    media_ids?: string[];
}

/**
 * Post a tweet using twitter-api-v2
 * @param text - Tweet text content
 * @param accessToken - User's OAuth2 access token
 * @param options - Optional tweet options
 * @returns Promise with tweet result
 */
export async function postTweet(
    accessToken: string,
    options: PostTweetOptions,
): Promise<TweetResult> {
    try {
        if (options.text && options.text.length > 280) {
            throw new Error("Tweet text exceeds 280 character limit");
        }

        // Create user-specific client
        const userClient = createUserClient(accessToken);

        let optionsPayload: Partial<SendTweetV2Params> = {};

        if (options.media_ids?.length) {
            // Twitter API allows max 4 media items
            const mediaIds = options.media_ids.slice(0, 4);
            optionsPayload.media = { 
                media_ids: mediaIds 
            } as SendTweetV2Params["media"];
        }

        const result = await userClient.v2.tweet(options.text, optionsPayload);

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
