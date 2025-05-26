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
    version: z.union([
        z.number().min(0),
        z.string().transform(val => parseInt(val, 10))
    ]).optional(),
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
                imageGen(options, "x"),
                imageGen(options, "linkedin"),  
            ]);
            return c.json(
                new ApiResponse<ImageGenResponse>({
                    statusCode: 200,
                    message: "Images generated",
                    data: {
                        x: xResult.status === "fulfilled" ? xResult.value.imageUrl : undefined,
                        linkedin: linkedinResult.status === "fulfilled" ? linkedinResult.value.imageUrl : undefined,
                    },
                }),
            );
        }

        try {
            const result = await imageGen(options, platform);
            return c.json(
                new ApiResponse<ImageGenResponse>({
                    statusCode: 200,
                    message: "Image generated",
                    data: {
                        [platform]: result.imageUrl,
                    },
                }),
            );
        } catch (error) {
            logger.error(error);
            throw new HTTPException(500, {
                message: "Failed to generate image",
            });
        }
    },
);

export default imageGenController;
