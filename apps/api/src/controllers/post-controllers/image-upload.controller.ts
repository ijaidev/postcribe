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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

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
            { message: "Only PNG, JPEG, and WEBP images are allowed" },
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

        try {
            const base64Image = await fileToBase64(image);
            return c.json(
                new ApiResponse({
                    status: 200,
                    message: "Image uploaded successfully",
                    data: {
                        image: base64Image,
                    },
                }),
                200,
            );
        } catch (error) {
            throw new HTTPException(500, {
                message: "Failed to generate post",
            });
        }
    },
);

export default imageUploadController;
