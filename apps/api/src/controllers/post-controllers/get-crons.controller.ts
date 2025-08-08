import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const getCronsController = factory.createHandlers(async c => {
    const user = c.get("user")!;

    try {
        const crons = await db.postCron.findMany({
            where: {
                userId: user.id,
                isDeleted: false,
            },
            orderBy: {
                createdAt: "desc",
            },
            include: {
                PostCronData: true,
            },
            omit: {
                autoApprove: true,
            },
        });

        return c.json(
            new ApiResponse<typeof crons>({
                message: "Automations fetched successfully",
                data: crons,
                status: 200,
            }),
            200,
        );
    } catch (error) {
        logger.error({ error }, "Error getting automations");
        throw new HTTPException(500, {
            message: "Internal server error: Failed to get crons",
        });
    }
});

export default getCronsController;
