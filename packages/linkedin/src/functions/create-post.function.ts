import type { LICreateRequestOptions } from "linkedin-api-client";
import { createLinkedInClient } from "../client";
import { getProfile } from "./get-profile.function";

interface ShareContent {
    shareCommentary: {
        text: string;
    };
    shareMediaCategory: string;
    media?: Array<{
        status: string;
        description?: { text: string };
        media?: string;
        title?: { text: string };
        originalUrl?: string;
        thumbnails?: string[];
    }>;
}

export interface LinkedInPostOptions {
    text: string;
    visibility?: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN_MEMBERS";
    media?: {
        title?: string;
        description?: string;
        media: string; // Asset URN
    };
    article?: {
        source: string;
        thumbnail?: string;
        title?: string;
        description?: string;
    };
}

export interface LinkedInPostResult {
    id: string;
    shareUrl?: string;
}

/**
 * Create a post on LinkedIn
 * @param options - Post options including text and media
 * @param accessToken - LinkedIn access token
 * @returns Created post information
 */
export async function createPost(
    options: LinkedInPostOptions,
    accessToken: string,
): Promise<LinkedInPostResult> {
    try {
        const client = createLinkedInClient();

        const person = await getProfile(accessToken);
        const personUrn = person?.id;
        if (!personUrn) {
            throw new Error("Failed to get LinkedIn profile");
        }
        const postData: LICreateRequestOptions = {
            resourcePath: "/ugcPosts",
            accessToken,
            entity: {
                author: personUrn,
                lifecycleState: "PUBLISHED",
                visibility: {
                    "com.linkedin.ugc.MemberNetworkVisibility":
                        options.visibility || "PUBLIC",
                },
                "com.linkedin.ugc.ShareContent": {
                    shareCommentary: {
                        text: options.text,
                    },
                    shareMediaCategory: options.media ? "IMAGE" : "NONE",
                } as ShareContent,
            },
        };

        // Add media if provided
        if (options.media) {
            postData.entity.specificContent[
                "com.linkedin.ugc.ShareContent"
            ].media = [
                {
                    status: "READY",
                    description: {
                        text: options.media.description || "",
                    },
                    media: options.media.media,
                    title: {
                        text: options.media.title || "",
                    },
                },
            ];
        }

        // Add article link if provided
        if (options.article) {
            postData.entity.specificContent[
                "com.linkedin.ugc.ShareContent"
            ].shareMediaCategory = "ARTICLE";
            postData.entity.specificContent[
                "com.linkedin.ugc.ShareContent"
            ].media = [
                {
                    status: "READY",
                    originalUrl: options.article.source,
                    title: {
                        text: options.article.title || "",
                    },
                    description: {
                        text: options.article.description || "",
                    },
                },
            ];

            if (options.article.thumbnail) {
                const media =
                    postData.entity.specificContent[
                        "com.linkedin.ugc.ShareContent"
                    ].media;
                if (media && media[0]) {
                    media[0].thumbnails = [options.article.thumbnail];
                }
            }
        }

        const response = await client.create({
            resourcePath: "/ugcPosts",
            entity: postData,
            accessToken,
        });

        return {
            id: response.createdEntityId as string,
            shareUrl: `https://www.linkedin.com/feed/update/${response.createdEntityId}`,
        };
    } catch (error) {
        console.error("Error creating LinkedIn post:", error);

        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("unauthorized")
            ) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (
                error.message.includes("403") ||
                error.message.includes("forbidden")
            ) {
                throw new Error(
                    "Insufficient permissions to create LinkedIn posts",
                );
            }

            if (
                error.message.includes("400") ||
                error.message.includes("bad request")
            ) {
                throw new Error("Invalid post data provided");
            }
        }

        throw new Error("Failed to create LinkedIn post");
    }
}

/**
 * Create a simple text post on LinkedIn
 * @param text - Post text content
 * @param accessToken - LinkedIn access token
 * @param personUrn - Person URN
 * @param visibility - Post visibility (default: PUBLIC)
 * @returns Created post information
 */
export async function createTextPost(
    text: string,
    accessToken: string,
    visibility: "PUBLIC" | "CONNECTIONS" | "LOGGED_IN_MEMBERS" = "PUBLIC",
): Promise<LinkedInPostResult> {
    return createPost({ text, visibility }, accessToken);
}

/**
 * Share an article on LinkedIn
 * @param text - Post text content
 * @param articleUrl - URL of the article to share
 * @param accessToken - LinkedIn access token
 * @param personUrn - Person URN
 * @param title - Article title (optional)
 * @param description - Article description (optional)
 * @returns Created post information
 */
export async function shareArticle(
    text: string,
    articleUrl: string,
    accessToken: string,
    title?: string,
    description?: string,
): Promise<LinkedInPostResult> {
    return createPost(
        {
            text,
            article: {
                source: articleUrl,
                title,
                description,
            },
        },
        accessToken,
    );
}
