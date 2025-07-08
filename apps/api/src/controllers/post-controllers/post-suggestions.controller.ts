import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { generatePostSuggestions } from "@repo/ai";
import { streamText } from "hono/streaming";
import { logger } from "@repo/logger";
import { getZodErrorMessage } from "../../utils/zod-error-message";
import db from "@repo/db";

const bodySchema = z.object({
    socialLoginId: z.string().min(1, "Social Login ID is required"),
    refresh: z.boolean().optional(),
});

const bodySchemaValidator = zValidator("json", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

const postSuggestionsController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const user = c.get("user")!;
        const { socialLoginId, refresh } = c.req.valid("json");

        try {
            const socialLogin = await db.socialLogin.findFirst({
                where: {
                    userId: user.id,
                    provider: "X",
                    id: socialLoginId,
                },
            });

            if (!socialLogin?.platformUserId) {
                throw new HTTPException(404, {
                    message: "Social login not found",
                });
            }

            const suggestionResult = await generatePostSuggestions(
                socialLogin.platformUserId,
                10, 
                refresh,    
            );

            return streamText(c, async stream => {
                try {
                    for await (const chunk of suggestionResult.stream()) {
                        await stream.write(
                            JSON.stringify({
                                event: chunk.event,
                                content: chunk.content,
                            }) + "\n",
                        );
                    }
                } catch (streamError) {
                    logger.error(
                        { error: streamError, platformUserId: socialLogin.platformUserId },
                        "Error during suggestion streaming",
                    );
                    await stream.write(
                        JSON.stringify({
                            event: "error",
                            content: "Stream interrupted",
                        }) + "\n",
                    );
                } finally {
                    stream.close();
                }
            });
        } catch (error) {
            logger.error(
                { error, socialLoginId },
                "Failed to generate post suggestions",
            );

            throw new HTTPException(500, {
                message: "Failed to generate post suggestions",
            });
        }
    },
);

export default postSuggestionsController;
