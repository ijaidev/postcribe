import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import type { DraftSchedule } from "@repo/db";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const scheduleDraftSchema = z.object({
    draftId: z.string().uuid({
        message: "Draft ID must be a valid UUID",
    }),
    scheduledAt: z.string().datetime({
        message: "Scheduled date must be a valid ISO datetime",
    }),
});

const bodyValidator = zValidator("json", scheduleDraftSchema);

export type ScheduleDraftInput = z.infer<typeof scheduleDraftSchema>;

const scheduleDraftController = factory.createHandlers(
    bodyValidator,
    async c => {
        const data = c.req.valid("json");
        const user = c.get("user")!;

        try {
            const draft = await db.draft.findUnique({
                where: {
                    id: data.draftId,
                    userId: user.id,
                    isDeleted: false,
                },
                select: {
                    id: true,
                    draftSchedule: true,
                },
            });

            if (!draft) {
                throw new HTTPException(404, {
                    message: "Draft not found",
                });
            }

            if (draft.draftSchedule) {
                throw new HTTPException(400, {
                    message: "Draft is already scheduled",
                });
            }

            const schedule = await db.draftSchedule.create({
                data: {
                    scheduledAt: new Date(data.scheduledAt),
                    draft: {
                        connect: {
                            id: data.draftId,
                        },
                    },
                },
                include: {
                    draft: {
                        include: {
                            posts: {
                                select: {
                                    id: true,
                                    post: true,
                                    postType: true,
                                    isPublished: true,
                                    publishedAt: true,
                                },
                            },
                        },
                    },
                },
            });

            return c.json(
                new ApiResponse<DraftSchedule>({
                    message: "Draft scheduled successfully",
                    data: schedule,
                    status: 201,
                }),
                201,
            );
        } catch (error: any) {
            if (error instanceof HTTPException) {
                throw error;
            }

            logger.error({ error }, "Error scheduling draft");
            throw new HTTPException(500, {
                message: "Internal server error: Failed to schedule draft",
            });
        }
    },
);

export default scheduleDraftController;
