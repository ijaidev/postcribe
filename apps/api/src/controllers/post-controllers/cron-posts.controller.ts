import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import fileToBase64 from "../../utils/file-to-base64";
import { uploadImages, type UploadImagesInput } from "@repo/s3";
import type { PostCron } from "@repo/db";
import ApiResponse from "../../utils/api-response";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const createPostCronSchema = z.object({
    title: z.string().min(2, {
        message: "Title must be at least 2 characters long",
    }),
    scheduledAt: z.string().datetime(),
    message: z.string().min(20, {
        message: "Message must be at least 20 characters long",
    }),
    platform: z.enum(["X", "LINKEDIN", "ALL"], { message: "Invalid platform" }),
    inputImages: z
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
    generateImage: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .optional()
        .default(false),
    imagePrompt: z.string().optional(),
    forceWeb: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .optional()
        .default(false),
});

const bodyValidator = zValidator("form", createPostCronSchema);

export type CreatePostCronInput = z.infer<typeof createPostCronSchema>;

const postCronController = factory.createHandlers(bodyValidator, async c => {
    const data = c.req.valid("form");
    const user = c.get("user")!;

    let images: UploadImagesInput = [];
    if (data.inputImages && data.inputImages.length > 0) {
        try {
            images = await Promise.all(
                data.inputImages.map(async file => ({
                    base64: await fileToBase64(file),
                    contentType:
                        file.type as UploadImagesInput[number]["contentType"],
                })),
            );
        } catch (error) {
            throw new HTTPException(500, {
                message: "Failed to process images",
            });
        }
    }

    const urls = await uploadImages(images);

    try {
        // Create PostCronData first

        const postCronData = await db.$transaction(async tx => {
            const postCronData = await tx.postCronData.create({
                data: {
                    message: data.message,
                    platform: data.platform,
                    inputImages: urls,
                    generateImage: data.generateImage,
                    imagePrompt: data.imagePrompt,
                    forceWeb: data.forceWeb,
                },
            });

            const postCron = await tx.postCron.create({
                data: {
                    title: data.title,
                    scheduledAt: new Date(data.scheduledAt).toISOString(),
                    userId: user.id,
                    postCronDataId: postCronData.id,
                },
            });
            return postCron;
        });

        return c.json(
            new ApiResponse<PostCron>({
                statusCode: 201,
                message: "Post cron created successfully",
                data: postCronData,
            }),
            201,
        );
    } catch (error: any) {
        throw new HTTPException(500, {
            message: "Internal server error, Failed to create post cron",
        });
    }
});

export default postCronController;
