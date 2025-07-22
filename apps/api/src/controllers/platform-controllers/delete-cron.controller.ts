import db from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getZodErrorMessage } from "../../utils/zod-error-message";

const deletePostCronSchema = z.object({
    id: z.string().min(1, "Cron ID is required"),
});
const deleteBodyValidator = zValidator(
    "param",
    deletePostCronSchema,
    result => {
        if (!result.success) {
            throw new HTTPException(400, {
                message: getZodErrorMessage(result.error),
            });
        }
    },
);

const deletePostCronController = factory.createHandlers(
    deleteBodyValidator,
    async c => {
        const { id } = c.req.valid("param");
        const user = c.get("user")!;
        try {
            const cron = await db.postCron.findUnique({
                where: { id, userId: user.id },
            });
            if (!cron || cron.isDeleted) {
                throw new HTTPException(404, {
                    message: "Automation not found",
                });
            }
            await db.postCron.update({
                where: { id },
                data: { isDeleted: true },
            });
            return c.json(
                new ApiResponse({ message: "Automation deleted", status: 200 }),
                200,
            );
        } catch (error) {
            logger.error({ error }, "Error deleting automation");
            throw new HTTPException(500, {
                message: "Internal server error: Failed to delete automation",
            });
        }
    },
);

export default deletePostCronController;
