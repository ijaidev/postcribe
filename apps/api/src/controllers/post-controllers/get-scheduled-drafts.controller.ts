import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import ApiResponse from "../../utils/api-response";

const getScheduledDraftsSchema = z.object({
    isPublished: z
        .string()
        .optional()
        .transform(val => val === "true")
        .pipe(z.boolean().optional().default(false)),
    limit: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 10))
        .pipe(z.number().int().min(1).max(100).optional()),
    offset: z
        .string()
        .optional()
        .transform(val => (val ? parseInt(val, 10) : 0))
        .pipe(z.number().int().min(0).optional()),
});

const queryValidator = zValidator("query", getScheduledDraftsSchema);

const getScheduledDraftsController = factory.createHandlers(
    queryValidator,
    async c => {
        const { isPublished, limit = 10, offset = 0 } = c.req.valid("query");
        const user = c.get("user")!;

        try {
            const [schedules, total] = await Promise.all([
                db.draftSchedule.findMany({
                    where: {
                        draft: {
                            userId: user.id,
                            isDeleted: false,
                        },
                        isPublished,
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
                            omit: {
                                userId: true,
                                isDeleted: true,
                            },
                        },
                    },
                    orderBy: {
                        scheduledAt: "desc",
                    },
                    take: limit,
                    skip: offset,
                }),
                db.draftSchedule.count({
                    where: {
                        draft: {
                            userId: user.id,
                            isDeleted: false,
                        },
                        isPublished,
                    },
                }),
            ]);

            const data = {
                schedules,
                total,
                limit,
                offset,
            };

            return c.json(
                new ApiResponse<typeof data>({
                    message: "Scheduled drafts fetched successfully",
                    data,
                    status: 200,
                }),
                200,
            );
        } catch (error: any) {
            throw new HTTPException(500, {
                message:
                    "Internal server error: Failed to fetch scheduled drafts",
            });
        }
    },
);

export default getScheduledDraftsController;
