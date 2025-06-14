import db from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";

const getSocialAccountsHandler = factory.createHandlers(async c => {
    const user = c.get("user")!;

    try {
        const socialAccounts = await db.socialLogin.findMany({
            where: {
                userId: user.id,
                isDeleted: false,
            },
            select: {
                id: true,
                name: true,
                provider: true,
                userName: true,
                createdAt: true,
                isConnected: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return c.json(
            new ApiResponse({
                data: socialAccounts,
                statusCode: 200,
                message: "Social accounts retrieved successfully",
            }),
            200,
        );
    } catch (error) {
        logger.error("Get social accounts error:", error);
        throw new HTTPException(500, {
            message: "Internal server error",
        });
    }
});

export default getSocialAccountsHandler; 