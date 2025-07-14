import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { postGen, type PostGenOptions } from "@repo/ai";
import { stream } from "hono/streaming";
import type { Draft } from "@prisma/client";
import fileToBase64 from "../../utils/file-to-base64";
import ApiResponse from "../../utils/api-response";
import { uploadImages } from "@repo/s3";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg"];

const bodySchema = z.object({
    image: z
        .instanceof(File)
        .refine(
            file => {
                if (!file) return true;
                return file.size <= MAX_FILE_SIZE;
            },
            { message: "Each image must be less than 5MB" },
        )
        .refine(
            file => {
                if (!file) return true;
                return ALLOWED_TYPES.includes(file.type);
            },
            { message: "Only PNG and JPEG images are allowed" },
        ),
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

const imageUploadController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const { image } = c.req.valid("form");
        console.log("image", image.type);

        try {
            const base64Image = await fileToBase64(image);

            // Extract base64 data from data URL (remove the data:image/...;base64, prefix)
            const base64Data = base64Image.split(",")[1];
            if (!base64Data) {
                throw new Error("Invalid base64 image format");
            }

            const uploadedImages = await uploadImages([
                {
                    base64: base64Data,
                    contentType: image.type as
                        | "image/png"
                        | "image/jpeg"
                        | "image/webp",
                },
            ]);

            return c.json(
                new ApiResponse({
                    status: 200,
                    message: "Image uploaded successfully",
                    data: {
                        imageUrl: uploadedImages[0], // Return the first (and only) uploaded image URL
                    },
                }),
                200,
            );
        } catch (error) {
            console.error("Image upload error:", error);
            throw new HTTPException(500, {
                message: "Failed to upload image",
            });
        }
    },
);

export default imageUploadController;
