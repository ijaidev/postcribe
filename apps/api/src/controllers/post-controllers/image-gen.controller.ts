import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { imageGen } from "@repo/ai";
import type { ImageGenOptions } from "@repo/ai";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";
import { getZodErrorMessage } from "../../utils/zod-error-message";

const bodySchema = z.object({
    id: z.string(),
    platform: z.enum(["linkedin", "x", "all"]),
    message: z.string(),
    images: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .transform(val => {
            if (!val) return undefined;
            return Array.isArray(val) ? val : [val];
        }),
    version: z
        .union([
            z.number().min(0),
            z.string().transform(val => {
                const parsed = parseInt(val, 10);
                if (isNaN(parsed) || parsed < 0) {
                    throw new Error("Version must be a non-negative number");
                }
                return parsed;
            }),
        ])
        .optional(),
});

const bodySchemaValidator = zValidator("json", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

interface ImageGenResponse {
    x?: string;
    linkedin?: string;
}

const imageGenController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const user = c.get("user")!;
        const { id, message, version, platform, images } = c.req.valid("json");

        const draft = await db.draft.findUnique({
            where: {
                id,
                userId: user.id,
            },
        });

        if (!draft) {
            throw new HTTPException(404, {
                message: "Draft not found",
            });
        }

        const options: ImageGenOptions = {
            draftId: draft.id,
            message,
            images: images && images.length > 0 ? images : undefined,
            version,
        };

        if (platform === "all") {
            const [xResult, linkedinResult] = await Promise.allSettled([
                imageGen(options, "X"),
                imageGen(options, "LINKEDIN"),
            ]);

            // Log any failures for debugging
            if (xResult.status === "rejected") {
                logger.error(
                    { error: xResult.reason },
                    "X image generation failed",
                );
            }
            if (linkedinResult.status === "rejected") {
                logger.error(
                    { error: linkedinResult.reason },
                    "LinkedIn image generation failed",
                );
            }

            const response: ImageGenResponse = {};

            if (xResult.status === "fulfilled") {
                response.x = xResult.value.imageUrl;
            }
            if (linkedinResult.status === "fulfilled") {
                response.linkedin = linkedinResult.value.imageUrl;
            }

            // If both failed, throw an error
            if (
                xResult.status === "rejected" &&
                linkedinResult.status === "rejected"
            ) {
                throw new HTTPException(500, {
                    message: "Failed to generate images for both platforms",
                });
            }

            return c.json(
                new ApiResponse<ImageGenResponse>({
                    message: "Images generated",
                    data: response,
                    status: 200,
                }),
                200,
            );
        }

        try {
            const result = await imageGen(
                options,
                platform.toUpperCase() as "X" | "LINKEDIN",
            );
            return c.json(
                new ApiResponse<ImageGenResponse>({
                    message: "Image generated",
                    data: {
                        [platform]: result.imageUrl,
                    },
                    status: 200,
                }),
                200,
            );
        } catch (error) {
            logger.error({ error }, "Failed to generate image");
            throw new HTTPException(500, {
                message: "Failed to generate image",
            });
        }
    },
);

export default imageGenController;
