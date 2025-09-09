import db, {
    CronState,
    type Draft,
    type PostCron,
    type PostCronData,
    type User,
} from "@repo/db";

import { logger } from "@repo/logger";
import {
    cronPostGen,
    generateNameWithDraftId,
    type CronPostGenOptions,
} from "@repo/ai";
import { sendEmail, type SendEmailOptions } from "@repo/mailer";
import {
    generatePostApprovalEmail,
    type PostApprovalEmailData,
    type NoCreditsEmailData,
    generateNoCreditsEmail,
} from "@repo/mail-templates";
import { type CronMessage } from "@repo/cron-sender";

// import {
//     postTweet,
//     getValidAccessToken as getXAccessToken,
//     uploadMediaBuffer,
//     type MediaUploadResult,
// } from "@repo/x";
// import {
//     createPost as createLinkedInPost,
//     getValidAccessToken as getLinkedInAccessToken,
// } from "@repo/linkedin";

import { getPosts } from "@repo/ai";

import dotenv from "dotenv";
dotenv.config();

interface DraftWithUser extends Draft {
    user: User;
}

interface PostCronWithData extends PostCron {
    PostCronData: PostCronData;
}

let creditsUsed = 0;

const updateCredits = async (userId: string, credits: number) => {
    await db.user.update({
        where: { id: userId },
        data: { credits: { decrement: credits } },
    });
};

const processAIGeneration = async (
    draft: DraftWithUser,
    postCron: PostCronWithData,
) => {
    const existingPosts = await getPosts({ draftId: draft.id });

    const hasXPost = existingPosts.x.posts.length > 0;
    const hasLinkedinPost = existingPosts.linkedin.posts.length > 0;
    const cronData = postCron.PostCronData;

    const isX =
        (cronData.platform === "X" || cronData.platform === "ALL") && !hasXPost;
    const isLinkedin =
        (cronData.platform === "LINKEDIN" || cronData.platform === "ALL") &&
        !hasLinkedinPost;

    let platform: "X" | "LINKEDIN" | "ALL" | undefined;
    if (isX && isLinkedin) {
        platform = "ALL";
    } else if (isX) {
        platform = "X";
    } else if (isLinkedin) {
        platform = "LINKEDIN";
    }

    if (platform) {
        const cronPostGenOptions: CronPostGenOptions = {
            draftId: draft.id,
            message: cronData.message,
            platform: platform,
            inputImages: cronData.inputImages,
            generateImage: cronData.generateImage,
            imagePrompt: cronData.imagePrompt || undefined,
            forceWeb: cronData.forceWeb,
        };

        await cronPostGen(cronPostGenOptions);
    }

    // if (postCron.autoApprove) {
    //     await db.draft.update({
    //         where: { id: draft.id },
    //         data: {
    //             cronState: CronState.POST_CREATION,
    //         },
    //     });
    //     await processPostCreation(draft, postCron);
    //     return;
    // }

    const name = await generateNameWithDraftId(draft.id, cronData.platform);
    const draftUpdate = await db.draft.update({
        where: { id: draft.id },
        data: {
            cronState: CronState.EMAIL_NOTIFICATION,
            title: name,
        },
    });
    draft.title = draftUpdate.title;
    await processEmailNotification(draft, postCron);
    await updateCredits(draft.userId, creditsUsed);
    return;
};

const processEmailNotification = async (
    draft: DraftWithUser,
    postCron: PostCronWithData,
) => {
    const existingPosts = await getPosts({ draftId: draft.id });
    const hasXPost = existingPosts.x.posts.length > 0;
    const hasLinkedinPost = existingPosts.linkedin.posts.length > 0;

    if (!hasXPost && !hasLinkedinPost) {
        throw new Error("No posts found for draft");
    }

    const baseUrl =
        process.env.FRONTEND_BASE_URL ||
        process.env.BASE_URL ||
        "http://localhost:3001";
    const reviewUrl = `${baseUrl}/draft/?draftId=${draft.id}`;

    const emailData: PostApprovalEmailData = {
        userName: draft.user.name || "User",
        postTitle: draft.title + " - " + postCron.title,
        reviewUrl: reviewUrl,
    };

    const htmlContent = generatePostApprovalEmail(emailData);

    const emailOptions: SendEmailOptions = {
        to: [{ name: draft.user.name || "User", email: draft.user.email }],
        subject: `Post Ready for Review: ${draft.title}`,
        htmlContent: htmlContent,
        sender: {
            name: "PostCribe",
            email: process.env.FROM_EMAIL || "noreply@postcribe.com",
        },
    };

    await sendEmail(emailOptions);

    await db.draft.update({
        where: { id: draft.id },
        data: {
            cronState: CronState.COMPLETED,
        },
    });

    return;
};

// const processPostCreation = async (
//     draft: DraftWithUser,
//     postCron: PostCronWithData,
// ) => {
//     const existingPosts = await getPosts({ draftId: draft.id });
//     const hasXPost = existingPosts.x.posts.length > 0;
//     const hasLinkedinPost = existingPosts.linkedin.posts.length > 0;

//     const platform = postCron.PostCronData.platform;

//     if (hasXPost || hasLinkedinPost) {
//         const postsToCreate: Prisma.PostCreateManyInput[] = [];

//         if (
//             (platform === "X" || platform === "ALL") &&
//             existingPosts.x.posts[0]?.post
//         ) {
//             postsToCreate.push({
//                 draftId: draft.id,
//                 postType: "X" as PostType,
//                 post: existingPosts.x.posts[0].post,
//                 socialLoginId: postCron.PostCronData.xSocialLoginId || "",
//             });
//         }

//         if (
//             (platform === "LINKEDIN" || platform === "ALL") &&
//             existingPosts.linkedin.posts[0]?.post
//         ) {
//             postsToCreate.push({
//                 draftId: draft.id,
//                 postType: "LINKEDIN" as PostType,
//                 post: existingPosts.linkedin.posts[0].post,
//                 socialLoginId:
//                     postCron.PostCronData.linkedinSocialLoginId || "",
//             });
//         }

//         if (postsToCreate.length > 0) {
//             await db.post.createMany({ data: postsToCreate });
//         }
//     }

//     if (postCron.PostCronData.generateImage) {
//         await db.draft.update({
//             where: { id: draft.id },
//             data: {
//                 cronState: CronState.MEDIA_UPLOAD,
//             },
//         });
//         await processMediaUpload(draft, postCron);
//         return;
//     }

//     await db.draft.update({
//         where: { id: draft.id },
//         data: {
//             cronState: CronState.PLATFORM_PUBLISHING,
//         },
//     });

//     await processPlatformPublishing(draft, postCron);

//     return;
// };

// const processMediaUpload = async (
//     draft: DraftWithUser,
//     postCron: PostCronWithData,
// ) => {
//     const existingPosts = await getPosts({ draftId: draft.id });
//     const hasXPost = existingPosts.x.posts.length > 0;
//     const hasLinkedinPost = existingPosts.linkedin.posts.length > 0;

//     const platform = postCron.PostCronData.platform;

//     const mediaPromises: Promise<MediaUploadResult>[] = [];

//     if ((platform === "X" || platform === "ALL") && hasXPost) {
//         const xImage = existingPosts.x.images[0];
//         if (xImage && xImage.url) {
//             const buffer = await fetch(xImage.url).then(res =>
//                 res.arrayBuffer(),
//             );
//             const media = uploadMediaBuffer(
//                 Buffer.from(buffer),
//                 "image/png",
//                 "x-image",
//             );
//             mediaPromises.push(media);
//         }
//     }

//     if ((platform === "LINKEDIN" || platform === "ALL") && hasLinkedinPost) {
//         const linkedinImage = existingPosts.linkedin.images[0];
//         if (linkedinImage && linkedinImage.url) {
//             const buffer = await fetch(linkedinImage.url).then(res =>
//                 res.arrayBuffer(),
//             );
//             const media = uploadMediaBuffer(
//                 Buffer.from(buffer),
//                 "image/png",
//                 "linkedin-image",
//             );
//             mediaPromises.push(media);
//         }
//     }

//     const dbPromises = [];
//     const mediaResults = await Promise.allSettled(mediaPromises);
//     const [xMediaId, linkedinMediaId] = mediaResults.map(result =>
//         result.status === "fulfilled" ? result.value.media_id_string : null,
//     );

//     const posts = await db.post.findMany({
//         where: {
//             draftId: draft.id,
//         },
//     });

//     const xPost = posts.find(post => post.postType === "X");
//     if (xMediaId && xPost) {
//         dbPromises.push(
//             db.post.update({
//                 where: {
//                     id: xPost.id,
//                 },
//                 data: {
//                     mediaIds: [xMediaId],
//                 },
//             }),
//         );
//     }

//     const linkedinPost = posts.find(post => post.postType === "LINKEDIN");
//     if (linkedinMediaId && linkedinPost) {
//         dbPromises.push(
//             db.post.update({
//                 where: {
//                     id: linkedinPost.id,
//                 },
//                 data: {
//                     mediaIds: [linkedinMediaId],
//                 },
//             }),
//         );
//     }

//     await Promise.all(dbPromises);

//     await db.draft.update({
//         where: { id: draft.id },
//         data: {
//             cronState: CronState.PLATFORM_PUBLISHING,
//         },
//     });

//     await processPlatformPublishing(draft, postCron);
// };

// const processPlatformPublishing = async (
//     draft: DraftWithUser,
//     postCron: PostCronWithData,
// ) => {
//     const dbPosts = await db.post.findMany({
//         where: { draftId: draft.id, isPublished: false },
//     });

//     const cronData = postCron.PostCronData;

//     if (cronData.platform === "X" || cronData.platform === "ALL") {
//         const xPost = dbPosts.find(post => post.postType === "X");
//         if (xPost && !xPost.isPublished) {
//             const xSocialLoginId = xPost.socialLoginId;
//             if (xSocialLoginId) {
//                 const xAccessToken = await getXAccessToken(xSocialLoginId);
//                 await postTweet(xAccessToken.accessToken, {
//                     text: xPost.post,
//                     media_ids:
//                         xPost.mediaIds.length > 0 ? xPost.mediaIds : undefined,
//                 });

//                 await db.post.update({
//                     where: { id: xPost.id },
//                     data: { isPublished: true, publishedAt: new Date() },
//                 });
//             }
//         }
//     }

//     if (cronData.platform === "LINKEDIN" || cronData.platform === "ALL") {
//         const linkedinPost = dbPosts.find(post => post.postType === "LINKEDIN");
//         if (linkedinPost && !linkedinPost.isPublished) {
//             const linkedinSocialLoginId = linkedinPost.socialLoginId;
//             if (linkedinSocialLoginId) {
//                 const linkedinAccessToken = await getLinkedInAccessToken(
//                     linkedinSocialLoginId,
//                 );

//                 const postOptions: any = {
//                     text: linkedinPost.post,
//                 };

//                 if (
//                     linkedinPost.mediaIds.length > 0 &&
//                     linkedinPost.mediaIds[0]
//                 ) {
//                     postOptions.media = {
//                         media: linkedinPost.mediaIds[0],
//                     };
//                 }

//                 await createLinkedInPost(
//                     postOptions,
//                     linkedinAccessToken.accessToken,
//                 );

//                 await db.post.update({
//                     where: { id: linkedinPost.id },
//                     data: { isPublished: true, publishedAt: new Date() },
//                 });
//             }
//         }
//     }

//     await db.draft.update({
//         where: { id: draft.id },
//         data: {
//             cronState: CronState.COMPLETED,
//             isPublished: true,
//             publishedAt: new Date(),
//             posts: {
//                 updateMany: {
//                     where: {
//                         draftId: draft.id,
//                     },
//                     data: {
//                         isPublished: true,
//                         publishedAt: new Date(),
//                     },
//                 },
//             },
//         },
//     });

//     return;
// };

const processCron = async (message: CronMessage, isRetry: boolean) => {
    const { id: cronId, userId } = message;
    let currentStage: CronState = CronState.DRAFT_CREATION;
    let draft: DraftWithUser | null = null;

    try {
        const postCron = await db.postCron.findUnique({
            where: { id: cronId, userId },
            include: {
                PostCronData: true,
                user: true,
            },
        });

        if (!postCron) {
            throw new Error(`PostCron not found for cronId: ${cronId}`);
        }

        let requiredCredits = 0;
        creditsUsed = 0;
        if (postCron.PostCronData.generateImage) {
            const imageCredits =
                postCron.PostCronData.platform === "ALL" ? 8 : 4;
            requiredCredits += imageCredits;
        }
        const textCredits = postCron.PostCronData.platform === "ALL" ? 2 : 1;
        requiredCredits += textCredits;

        if (postCron.user.credits < requiredCredits) {
            const baseUrl =
                process.env.FRONTEND_BASE_URL ||
                process.env.BASE_URL ||
                "http://localhost:3001";

            const noCreditsData: NoCreditsEmailData = {
                userName: postCron.user.name || "User",
                message:
                    "We can't process your automation because you don't have enough credits.",
                accountUrl: baseUrl,
            };

            const htmlContent = generateNoCreditsEmail(noCreditsData);

            const emailOptions: SendEmailOptions = {
                to: [
                    {
                        name: postCron.user.name || "User",
                        email: postCron.user.email,
                    },
                ],
                subject: "No Credits Left",
                htmlContent: htmlContent,
                sender: {
                    name: "PostCribe",
                    email: process.env.FROM_EMAIL || "noreply@postcribe.com",
                },
            };

            await sendEmail(emailOptions);
            await db.postCron.update({
                where: { id: postCron.id },
                data: { isActive: false },
            });
            return;
        }

        creditsUsed = requiredCredits;

        if (isRetry) {
            draft = await db.draft.findFirst({
                where: { postCronId: postCron.id, userId },
                orderBy: {
                    createdAt: "desc",
                },
                include: {
                    user: true,
                },
            });
            if (draft?.cronState === CronState.COMPLETED) return;
        }
        if (!draft) {
            draft = await db.draft.create({
                data: {
                    userId,
                    title: `Draft for ${postCron.title}`,
                    postCronId: postCron.id,
                    cronState: CronState.AI_GENERATION,
                },
                include: {
                    user: true,
                },
            });
        }

        currentStage = draft.cronState as CronState;

        switch (currentStage) {
            case CronState.AI_GENERATION:
                await processAIGeneration(draft, postCron);
                break;
            case CronState.EMAIL_NOTIFICATION:
                await processEmailNotification(draft, postCron);
                break;
            // case CronState.MEDIA_UPLOAD:
            //     await processMediaUpload(draft, postCron);
            //     break;
            // case CronState.POST_CREATION:
            //     await processPostCreation(draft, postCron);
            //     break;
            // case CronState.PLATFORM_PUBLISHING:
            //     await processPlatformPublishing(draft, postCron);
            //     break;
            case CronState.COMPLETED:
                return;
        }
    } catch (error) {
        logger.error({ error, cronId }, "Error processing cron message");
        throw error;
    }
};

export default processCron;
