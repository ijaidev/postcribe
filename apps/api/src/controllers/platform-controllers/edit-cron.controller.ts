import db, { type PostCron, type PostCronData } from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getZodErrorMessage } from "../../utils/zod-error-message";

const editPostCronSchema = z.object({
    id: z.string().min(1, "Cron ID is required"),
    title: z.string().min(2).optional(),
    scheduledAt: z.string().datetime().optional(),
    repeatInterval: z.number().min(1).optional(),
    repeatIntervalUnit: z.enum(["HOUR", "DAY", "WEEK", "MONTH"]).optional(),
    message: z.string().min(20).optional(),
    platform: z.enum(["X", "LINKEDIN", "ALL"]).optional(),
    inputImages: z.union([z.string(), z.array(z.string()).max(5)]).optional(),
    generateImage: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .optional(),
    imagePrompt: z.string().min(10).optional(),
    forceWeb: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .optional(),
    isActive: z.boolean().optional(),
});
const editBodyValidator = zValidator("json", editPostCronSchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

const editPostCronController = factory.createHandlers(
    editBodyValidator,
    async c => {
        const { id, ...data } = c.req.valid("json");
        const user = c.get("user")!;
        try {
            const cron = await db.postCron.findUnique({
                where: { id, userId: user.id },
                include: { PostCronData: true },
            });
            if (!cron || cron.isDeleted) {
                throw new HTTPException(404, {
                    message: "Automation not found",
                });
            }
            // Update postCronData if any relevant fields are present
            const postCronDataUpdates: Partial<PostCronData> = {};
            if (data.message !== undefined)
                postCronDataUpdates.message = data.message;
            if (data.platform !== undefined)
                postCronDataUpdates.platform = data.platform;
            if (data.inputImages !== undefined)
                postCronDataUpdates.inputImages = Array.isArray(
                    data.inputImages,
                )
                    ? data.inputImages
                    : [data.inputImages];
            if (data.generateImage !== undefined)
                postCronDataUpdates.generateImage = data.generateImage;
            if (data.imagePrompt !== undefined)
                postCronDataUpdates.imagePrompt = data.imagePrompt;
            if (data.forceWeb !== undefined)
                postCronDataUpdates.forceWeb = data.forceWeb;
            if (Object.keys(postCronDataUpdates).length > 0) {
                await db.postCronData.update({
                    where: { id: cron.postCronDataId },
                    data: postCronDataUpdates,
                });
            }
            // Update postCron main fields
            const postCronUpdates: Partial<PostCron> = {};
            if (data.title !== undefined) postCronUpdates.title = data.title;
            if (data.scheduledAt !== undefined)
                postCronUpdates.scheduledAt = new Date(data.scheduledAt);
            if (data.repeatInterval !== undefined)
                postCronUpdates.repeatInterval = data.repeatInterval;
            if (data.repeatIntervalUnit !== undefined)
                postCronUpdates.repeatIntervalUnit = data.repeatIntervalUnit;
            if (data.isActive !== undefined)
                postCronUpdates.isActive = data.isActive;

            type UpdatedCron = Omit<PostCron, "autoApprove" | "isDeleted"> & {
                PostCronData: PostCronData;
            };
            let updatedCron: UpdatedCron | null = null;
            if (Object.keys(postCronUpdates).length > 0) {
                updatedCron = await db.postCron.update({
                    where: { id },
                    data: postCronUpdates,
                    include: { PostCronData: true },
                    omit: {
                        autoApprove: true,
                        isDeleted: true,
                    },
                });
            }
            return c.json(
                new ApiResponse({
                    message: "Automation updated",
                    status: 200,
                    data: updatedCron,
                }),
                200,
            );
        } catch (error) {
            logger.error({ error }, "Error editing automation");
            throw new HTTPException(500, {
                message: "Internal server error: Failed to edit automation",
            });
        }
    },
);

export default editPostCronController;
