import { logger } from "@repo/logger";
import axios, { isAxiosError } from "axios";
import type {
    UserTweets,
    CleanTweet,
    Tweet,
    TweetWithVisibilityResults,
    UserInfoResponse,
} from "../types";

const X_RAPID_API_KEY = process.env.X_RAPID_API_KEY;
const X_RAPID_API_HOST = "twitter241.p.rapidapi.com";

const headers = {
    "x-rapidapi-key": X_RAPID_API_KEY,
    "x-rapidapi-host": X_RAPID_API_HOST,
};

export const getUserInfo = async (username: string) => {
    const options = {
        method: "GET",
        url: "https://twitter241.p.rapidapi.com/user",
        params: {
            username: username,
        },
        headers: headers,
    };

    try {
        const response = await axios.request<UserInfoResponse>(options);
        if (!response.data.result.data?.user) {
            return {
                id: "",
                isVerified: false,
            };
        }
        return {
            id: response.data.result.data.user.result.rest_id || "",
            isVerified:
                response.data.result.data.user.result.is_blue_verified || false,
        };
    } catch (error) {
        if (isAxiosError(error)) {
            if (error.response?.status === 404) {
                return {
                    id: "",
                    isVerified: false,
                };
            }
        }
        logger.error({ error }, "Failed to get user info");
        throw error;
    }
};

const extractTweetData = (
    tweetResult: Tweet | TweetWithVisibilityResults,
): CleanTweet => {
    // Handle TweetWithVisibilityResults wrapper
    const tweet =
        tweetResult.__typename === "TweetWithVisibilityResults"
            ? tweetResult.tweet
            : tweetResult;

    // Extract mentions with proper typing
    const mentions =
        tweet.legacy.entities.user_mentions?.map(mention => ({
            id: mention.id_str,
            name: mention.name,
            username: mention.screen_name,
            indices: mention.indices,
        })) || [];

    return {
        id: tweet.rest_id,
        text: tweet.legacy.full_text,
        created_at: tweet.legacy.created_at,
        metrics: {
            likes: tweet.legacy.favorite_count,
            retweets: tweet.legacy.retweet_count,
            replies: tweet.legacy.reply_count,
            quotes: tweet.legacy.quote_count,
            bookmarks: tweet.legacy.bookmark_count,
            views: tweet.views?.count || "0",
        },
        mentions,
    };
};

export const getUserTweets = async (userId: string): Promise<CleanTweet[]> => {
    const options = {
        method: "GET",
        url: "https://twitter241.p.rapidapi.com/user-tweets",
        params: {
            user: userId,
            count: "50",
        },
        headers: headers,
    };

    try {
        const response = await axios.request<UserTweets>(options);
        const instructions = response.data.result.timeline.instructions;

        // Extract tweets from the nested structure
        const tweets: CleanTweet[] = [];

        for (const instruction of instructions) {
            if (
                instruction.type === "TimelineAddEntries" &&
                instruction.entries
            ) {
                for (const entry of instruction.entries) {
                    // Handle TimelineTimelineItem (individual tweets)
                    if (entry.content.entryType === "TimelineTimelineItem") {
                        if (
                            entry.content.itemContent.itemType ===
                            "TimelineTweet"
                        ) {
                            const tweetResult =
                                entry.content.itemContent.tweet_results.result;
                            tweets.push(extractTweetData(tweetResult));
                        }
                    }
                }
            }
        }

        return tweets;
    } catch (error) {
        logger.error({ error }, "Failed to get user tweets");
        throw error;
    }
};

// TEMPORARY PLACEHOLDER FUNCTIONS - TO BE IMPLEMENTED
export const uploadMediaBuffer = async (
    mediaBuffer: Buffer,
    mimeType: string,
    accessToken: string,
    altText?: string,
    expiresAfterSecs?: number,
) => {
    throw new Error("uploadMediaBuffer not implemented yet");
};

export const getValidAccessToken = async (socialLoginId: string) => {
    throw new Error("getValidAccessToken not implemented yet");
};
