import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import factory from "../../utils/factory";
import db from "@repo/db";
import { getZodErrorMessage } from "../../utils/zod-error-message";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const querySchema = z.object({
    page: z.string().optional().default("1"),
    pageSize: z.string().min(1).max(100).optional().default("10"),
});

const zv = zValidator("query", querySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

const getDraftsHandler = factory.createHandlers(zv, async c => {
    const user = c.get("user")!;
    const { page, pageSize } = c.req.valid("query");
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSizeNum = Math.max(1, parseInt(pageSize, 10) || 10);
    try {
        const [drafts, total] = await Promise.all([
            db.draft.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                skip: (pageNum - 1) * pageSizeNum,
                take: pageSizeNum,
                select: {
                    id: true,
                    title: true,
                },
            }),
            db.draft.count({ where: { userId: user.id } }),
        ]);
        return c.json(
            new ApiResponse({
                data: {
                    drafts,
                    total,
                    page: pageNum,
                    pageSize: pageSizeNum,
                },
                message: "Drafts fetched successfully",
                status: 200,
            }),
            200,
        );
    } catch (err) {
        logger.error({ err }, "Error fetching drafts");
        throw new HTTPException(500, {
            message: "Internal server error, please try again later",
        });
    }
});

export default getDraftsHandler;
