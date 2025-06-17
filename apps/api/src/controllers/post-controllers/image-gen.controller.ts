import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { imageGen } from "@repo/ai";
import type { ImageGenOptions } from "@repo/ai";
import fileToBase64 from "../../utils/file-to-base64";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const bodySchema = z.object({
    id: z.string(),
    platform: z.enum(["linkedin", "x", "all"]),
    message: z.string(),
    images: z
        .union([z.instanceof(File), z.array(z.instanceof(File))])
        .optional()
        .transform(val => {
            if (!val) return undefined;
            return Array.isArray(val) ? val : [val];
        })
        .refine(
            files => {
                if (!files) return true;
                return files.every(file => file.size <= MAX_FILE_SIZE);
            },
            { message: "Each image must be less than 5MB" },
        )
        .refine(
            files => {
                if (!files) return true;
                return files.every(file => ALLOWED_TYPES.includes(file.type));
            },
            { message: "Only PNG, JPEG, and WEBP images are allowed" },
        ),
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

const bodySchemaValidator = zValidator("form", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message:
                "Invalid Body: " +
                result.error.errors.map(e => e.message).join(", "),
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
        const { id, message, version, platform, images } = c.req.valid("form");

        // Convert images to base64 URLs
        let base64Images: string[] = [];
        if (images && images.length > 0) {
            try {
                base64Images = await Promise.all(
                    images.map(file => fileToBase64(file)),
                );
            } catch (error) {
                throw new HTTPException(500, {
                    message: "Failed to process images",
                });
            }
        }

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
            images: base64Images.length > 0 ? base64Images : undefined,
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
