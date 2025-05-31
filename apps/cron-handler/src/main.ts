import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import db from "@repo/db";
import { type CronMessage } from "@repo/cron-sender/types";
import { logger } from "@repo/logger";
import { cronPostGen, type CronPostGenOptions } from "@repo/ai";
import { sendEmail, type SendEmailOptions } from "@repo/mailer";
import {
    generatePostApprovalEmail,
    type PostApprovalEmailData,
} from "@repo/mail-templates";

const sqsClient = new SQSClient({});

const processCron = async (message: CronMessage) => {
    try {
        // Fetch the PostCron with its data
        const postCron = await db.postCron.findUnique({
            where: {
                id: message.id,
                userId: message.userId,
                isDeleted: false,
            },
            include: {
                PostCronData: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        if (!postCron) {
            logger.warn(`PostCron not found: ${message.id}`);
            return;
        }

        if (!postCron.isActive) {
            logger.info(`PostCron is not active: ${message.id}`);
            return;
        }

        // Create a draft for this cron post
        const draft = await db.draft.create({
            data: {
                userId: postCron.userId,
            },
        });

        // Prepare options for AI post generation
        const cronPostGenOptions: CronPostGenOptions = {
            draftId: draft.id,
            message: postCron.PostCronData.message,
            platform: postCron.PostCronData.platform.toLowerCase() as
                | "x"
                | "linkedin"
                | "all",
            inputImages: postCron.PostCronData.inputImages,
            generateImage: postCron.PostCronData.generateImage,
            imagePrompt: postCron.PostCronData.imagePrompt || undefined,
            forceWeb: postCron.PostCronData.forceWeb,
        };

        // Generate the post using AI
        await cronPostGen(cronPostGenOptions);

        // Handle auto-approval or send notification email
        if (postCron.autoApprove) {
            // Auto-approve: publish the post immediately
            await publishDraft(draft.id);
        } else {
            // Send notification email for manual approval
            await sendApprovalEmail(postCron.user, draft.id, postCron.title);
        }
    } catch (error) {
        logger.error(`Error processing cron message ${message.id}:`, error);
        throw error;
    }
};

const publishDraft = async (draftId: string) => {
    try {
        // Update all posts in the draft to published
        await db.post.updateMany({
            where: {
                draftId: draftId,
                isDeleted: false,
            },
            data: {
                isPublished: true,
                publishedAt: new Date(),
            },
        });
    } catch (error) {
        logger.error(`Error publishing draft ${draftId}:`, error);
        throw error;
    }
};


export default processCron;
