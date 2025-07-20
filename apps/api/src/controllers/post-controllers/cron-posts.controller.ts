import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const getNextRunAt = (scheduledAt: Date) => {
    // Extract time components from the scheduled date (in UTC)
    const scheduledHour = scheduledAt.getUTCHours();
    const scheduledMinute = scheduledAt.getUTCMinutes();
    const scheduledSecond = scheduledAt.getUTCSeconds();

    // Get current UTC time
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth();
    const currentDate = now.getUTCDate();

    // Create today's date at the scheduled time (UTC)
    const todayAtScheduledTime = new Date(
        Date.UTC(
            currentYear,
            currentMonth,
            currentDate,
            scheduledHour,
            scheduledMinute,
            scheduledSecond,
        ),
    );

    // If the scheduled time today has already passed, move to next occurrence
    let nextRunAt: Date;

    if (todayAtScheduledTime <= now) {
        nextRunAt = new Date();
        nextRunAt.setDate(now.getDate() + 1);
        nextRunAt.setUTCHours(
            scheduledHour,
            scheduledMinute,
            scheduledSecond,
            0,
        );
    } else {
        // Time hasn't passed today, use today's scheduled time
        nextRunAt = todayAtScheduledTime;
    }

    return nextRunAt;
};

const createPostCronSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters long",
    }),
    scheduledAt: z.string().datetime(),
    repeatInterval: z.number().min(1, "Repeat interval must be at least 1"),
    repeatIntervalUnit: z.enum(["MINUTE", "HOUR", "DAY", "WEEK", "MONTH"], {
        message: "Invalid repeat interval unit",
    }),
    message: z.string().min(20, {
        message: "Message must be at least 20 characters long",
    }),
    platform: z.enum(["X", "LINKEDIN", "ALL"], { message: "Invalid platform" }),
    inputImages: z
        .union([z.string(), z.array(z.string()).max(5)])
        .optional()
        .transform(val => {
            if (!val) return [];
            // Ensure it's always an array
            return Array.isArray(val) ? val : [val];
        })
        .default([]),
    generateImage: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .optional()
        .default(false),
    imagePrompt: z.string().optional(),
    forceWeb: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .default(false),
});

const bodyValidator = zValidator("json", createPostCronSchema);

export type CreatePostCronInput = z.infer<typeof createPostCronSchema>;

const postCronController = factory.createHandlers(bodyValidator, async c => {
    const data = c.req.valid("json");
    const user = c.get("user")!;

    try {
        const result = await db.$transaction(async tx => {
            const postCronData = await tx.postCronData.create({
                data: {
                    message: data.message,
                    platform: data.platform,
                    inputImages: data.inputImages,
                    generateImage: data.generateImage,
                    imagePrompt: data.imagePrompt,
                    forceWeb: data.forceWeb,
                },
            });

            const scheduledAt = new Date(data.scheduledAt);
            const nextRunAt = getNextRunAt(scheduledAt);

            const postCron = await tx.postCron.create({
                data: {
                    title: data.title,
                    scheduledAt: scheduledAt,
                    userId: user.id,
                    postCronDataId: postCronData.id,
                    repeatInterval: data.repeatInterval,
                    repeatIntervalUnit: data.repeatIntervalUnit,
                    nextRunAt: nextRunAt,
                    isActive: false,
                    autoApprove: false,
                },
                omit: {
                    userId: true,
                    postCronDataId: true,
                },
            });

            return postCron;
        });

        return c.json(
            new ApiResponse<typeof result>({
                message: "Automation created successfully",
                data: result,
                status: 201,
            }),
            201,
        );
    } catch (error: any) {
        if (error.message?.includes("Failed to process images")) {
            throw error;
        }

        logger.error({ error }, "Error creating automation");
        throw new HTTPException(500, {
            message: "Internal server error: Failed to create automation",
        });
    }
});

export default postCronController;
