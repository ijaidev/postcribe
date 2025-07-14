import { applyVersionPost, applyVersionImage } from "@repo/ai";
import { z } from "zod";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import { getZodErrorMessage } from "../../utils/zod-error-message";
import { zValidator } from "@hono/zod-validator";
import db from "@repo/db";
import { logger } from "@repo/logger";
import ApiResponse from "../../utils/api-response";

const bodySchema = z.object({
    applyVersion: z.number(),
    draftId: z.string(),
    platform: z.enum(["X", "LINKEDIN"]),
    applyOn: z.enum(["IMAGE", "POST"]),
});

const bodySchemaValidator = zValidator("json", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

const applyVersionController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        try {
            const { applyVersion, draftId, platform, applyOn } =
                c.req.valid("json");
            const user = c.get("user")!;

            const draft = await db.draft.findUnique({
                where: {
                    id: draftId,
                    userId: user.id,
                },
            });
            if (!draft) {
                throw new HTTPException(404, {
                    message: "Draft not found",
                });
            }
            if (applyOn === "POST") {
                await applyVersionPost({
                    applyVersion,
                    draftId,
                    platform: platform as "X" | "LINKEDIN",
                });
            }
            if (applyOn === "IMAGE") {
                await applyVersionImage({
                    applyVersion,
                    draftId,
                    platform: platform as "X" | "LINKEDIN",
                });
            }

            return c.json(
                new ApiResponse({
                    message: "Apply version successful",
                    status: 200,
                }),
                200,
            );
        } catch (error) {
            logger.error(error);
            throw new HTTPException(500, {
                message: "Failed to apply version",
            });
        }
    },
);

export default applyVersionController;
