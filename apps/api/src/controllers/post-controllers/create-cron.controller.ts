import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const createPostCronSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters long",
    }),
    scheduledAt: z.string().datetime(),
    repeatInterval: z.number().min(1, "Repeat interval must be at least 1"),
    repeatIntervalUnit: z.enum(["HOUR", "DAY", "WEEK", "MONTH"], {
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
    imagePrompt: z.string().min(10).optional(),
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
            const nextRunAt = scheduledAt;

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
                    isDeleted: true,
                    autoApprove: true,
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
