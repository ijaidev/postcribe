import db from "@repo/db";
import {
    postTweet,
    getValidAccessToken as getXAccessToken,
    type TweetResult,
} from "@repo/x";
import {
    createPost as createLinkedInPost,
    getValidAccessToken as getLinkedInAccessToken,
    type LinkedInPostResult,
} from "@repo/linkedin";

/**
 * Process a scheduled draft by publishing posts to platforms
 * @param draftId - The ID of the draft to process
 */
export async function processScheduledDraft(draftId: string): Promise<void> {
    const draft = await db.draft.findUnique({
        where: {
            id: draftId,
            isDeleted: false,
        },
        include: {
            posts: {
                include: {
                    socialLogin: true,
                },
            },
            user: true,
            draftSchedule: true,
        },
    });

    if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
    }

    const xPost = draft.posts.find(post => post.postType === "X");
    const linkedinPost = draft.posts.find(post => post.postType === "LINKEDIN");

    let postPromises: Promise<TweetResult | LinkedInPostResult>[] = [];

    if (xPost && !xPost.isPublished) {
        const { accessToken } = await getXAccessToken(xPost.socialLogin.id);
        postPromises.push(
            postTweet(accessToken, {
                text: xPost.post,
                media_ids: xPost.mediaIds,
            }),
        );
    }

    if (linkedinPost && !linkedinPost.isPublished) {
        const { accessToken } = await getLinkedInAccessToken(
            linkedinPost.socialLogin.id,
        );
        postPromises.push(
            createLinkedInPost(
                {
                    text: linkedinPost.post,
                    media: linkedinPost.mediaIds
                        ? {
                              media: linkedinPost.mediaIds[0] || "",
                          }
                        : undefined,
                },
                accessToken,
            ),
        );
    }

    const [xResult, linkedinResult] = await Promise.allSettled(postPromises);

    const isDraftPublished =
        xResult?.status === "fulfilled" &&
        linkedinResult?.status === "fulfilled";

    if (isDraftPublished) {
        await db.draft.update({
            where: { id: draftId },
            data: {
                isPublished: true,
                publishedAt: new Date(),
                posts: {
                    updateMany: {
                        where: {
                            draftId: draftId,
                        },
                        data: {
                            isPublished: true,
                            publishedAt: new Date(),
                        },
                    },
                },
            },
        });
        return;
    }

    if (xResult?.status === "fulfilled") {
        await db.post.update({
            where: { id: xPost?.id },
            data: {
                isPublished: true,
                publishedAt: new Date(),
            },
        });
    }

    if (linkedinResult?.status === "fulfilled") {
        await db.post.update({
            where: { id: linkedinPost?.id },
            data: {
                isPublished: true,
                publishedAt: new Date(),
            },
        });
    }
    return;
}
