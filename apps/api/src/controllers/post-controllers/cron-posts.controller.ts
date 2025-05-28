import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import factory from "../../utils/factory";
import { HTTPException } from "hono/http-exception";
import fileToBase64 from "../../utils/file-to-base64";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const createPostCronSchema = z.object({
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


    let base64Images: string[] = [];
        if (data.inputImages && data.inputImages.length > 0) {
            try {
                base64Images = await Promise.all(
                    data.inputImages.map(file => fileToBase64(file)),
                );
            } catch (error) {
                throw new HTTPException(500, {
                    message: "Failed to process images",
                });
            }
        }



        const key = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
        const image_bytes = Buffer.from(image_base64, "base64");
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: image_bytes,
            ContentType: "image/png",
        });


    try {
        // Create the PostCronData first
        const postCronData = await db.postCronData.create({
            data: {
                message: data.message,
                platform: data.platform,
                inputImages: base64Images,
                generateImage: data.generateImage,
                imagePrompt: data.imagePrompt,
                forceWeb: data.forceWeb,
            },
        });

        // Then create the PostCron, linking it to the PostCronData
        const postCron = await db.postCron.create({
            data: {
                scheduledAt: new Date(data.scheduledAt),
                postCronDataId: postCronData.id,
            },
            include: {
                // Optionally include the related data in the response
                PostCronData: true,
            },
        });

        return c.json({ success: true, data: postCron }, 201);
    } catch (error: any) {
        console.error("Error creating post cron:", error);
        if (error instanceof PrismaClientKnownRequestError) {
            // Handle known Prisma errors (e.g., unique constraint violation)
            return c.json(
                {
                    success: false,
                    message: `Failed to create post cron: ${error.message}`,
                },
                400,
            );
        }
        return c.json(
            { success: false, message: "An unexpected error occurred." },
            500,
        );
    }
});

export default postCronController;
