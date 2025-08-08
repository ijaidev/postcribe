import db from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const getCronSchema = z.object({
    id: z.string().min(1, "Cron ID is required"),
});
const getParamValidator = zValidator("param", getCronSchema);

const getCronController = factory.createHandlers(getParamValidator, async c => {
    const { id } = c.req.valid("param");
    const user = c.get("user")!;
    try {
        const cron = await db.postCron.findUnique({
            where: { id, userId: user.id, isDeleted: false },
            include: { PostCronData: true },
            omit: {
                autoApprove: true,
            },
        });
        if (!cron) {
            throw new HTTPException(404, { message: "Automation not found" });
        }
        return c.json(
            new ApiResponse({
                data: cron,
                message: "Automation fetched",
                status: 200,
            }),
            200,
        );
    } catch (error) {
        logger.error({ error }, "Error fetching automation");
        throw new HTTPException(500, {
            message: "Internal server error: Failed to fetch automation",
        });
    }
});

export default getCronController;
