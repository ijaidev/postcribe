import type { CleanTweet } from "../types";
export declare const getUserInfo: (username: string) => Promise<{
    id: string;
    isVerified: boolean;
}>;
export declare const getUserTweets: (userId: string) => Promise<CleanTweet[]>;
