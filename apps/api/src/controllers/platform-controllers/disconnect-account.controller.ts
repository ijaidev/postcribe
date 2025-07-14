import db from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const disconnectAccountSchema = z.object({
    accountId: z
        .string({ message: "Account ID is required" })
        .min(1, { message: "Account ID is required" }),
});

const bodyValidator = zValidator(
    "json",
    disconnectAccountSchema,
    (result, c) => {
        if (!result.success) {
            throw new HTTPException(400, {
                message: "Account ID is required",
            });
        }
    },
);

const disconnectAccountHandler = factory.createHandlers(
    bodyValidator,
    async c => {
        const { accountId } = c.req.valid("json");
        const user = c.get("user")!;

        try {
            // First check if the account exists and belongs to the user
            const existingAccount = await db.socialLogin.findFirst({
                where: {
                    id: accountId,
                    userId: user.id,
                    isDeleted: false,
                },
            });

            if (!existingAccount) {
                throw new HTTPException(404, {
                    message: "Social account not found or already disconnected",
                });
            }

            // Update the account to disconnect it
            const disconnectedAccount = await db.socialLogin.update({
                where: {
                    id: accountId,
                },
                data: {
                    accessToken: null,
                    refreshToken: null,
                    isDeleted: true,
                    isConnected: false,
                },
                select: {
                    id: true,
                    name: true,
                    provider: true,
                    userName: true,
                },
            });

            return c.json(
                new ApiResponse({
                    data: disconnectedAccount,
                    message: "Social account disconnected successfully",
                    status: 200,
                }),
                200,
            );
        } catch (error) {
            logger.error({ error }, "Disconnect account error");

            if (error instanceof HTTPException) {
                throw error;
            }

            throw new HTTPException(500, {
                message: "Internal server error",
            });
        }
    },
);

export default disconnectAccountHandler;
