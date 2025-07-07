import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { postGen, type PostGenOptions } from "@repo/ai";
import { stream } from "hono/streaming";
import type { Draft } from "@prisma/client";
import fileToBase64 from "../../utils/file-to-base64";
import { base64 } from "zod/v4";
import { getZodErrorMessage } from "../../utils/zod-error-message";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const bodySchema = z.object({
    id: z.string().optional(),
    platform: z.enum(["linkedin", "x", "all"]),
    message: z.string(),
    images: z
        .union([
            z.string(),
            z.array(z.string()),
        ])
        .optional()
        .transform(val => {
            if (!val) return undefined;
            // Ensure it's always an array
            return Array.isArray(val) ? val : [val];
        })
        .refine(
            (images) => {
                if (!images) return true;
                
                // Validate each image
                for (const image of images) {
                    // Check if it's a valid base64 data URL
                    if (!image.startsWith('data:image/')) {
                        throw new Error('Each image must be a valid data URL starting with data:image/');
                    }
                    
                    // Extract MIME type
                    const mimeMatch = image.match(/^data:image\/([a-z]+);base64,/);
                    if (!mimeMatch) {
                        throw new Error('Invalid image format');
                    }
                    
                    const mimeType = `image/${mimeMatch[1]}`;
                    if (!ALLOWED_TYPES.includes(mimeType)) {
                        throw new Error(`Invalid image type. Allowed types: ${ALLOWED_TYPES.join(', ')}`);
                    }
                    
                    // Extract base64 content and check size
                    const base64Content = image.split(',')[1];
                    if (!base64Content) {
                        throw new Error('Invalid base64 content');
                    }
                    
                    // Calculate file size from base64 (base64 is ~4/3 larger than original)
                    const sizeInBytes = (base64Content.length * 3) / 4;
                    if (sizeInBytes > MAX_FILE_SIZE) {
                        throw new Error(`Each image must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
                    }
                }
                
                return true;
            },
            { message: "Images are not valid" }
        ),
    forceWeb: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .default(false),
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
            message: getZodErrorMessage(result.error),
        });
    }
});

const postGenController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const user = c.get("user")!;
        const { id, message, forceWeb, version, platform, images } =
            c.req.valid("form");

        // Images are already validated base64 strings from Zod schema
        const base64Images: string[] = images || [];

        let draft: Draft | null = null;

        if (!id) {
            draft = await db.draft.create({
                data: {
                    userId: user.id,
                    title: "Generated Post Draft",
                },
            });
        } else {
            draft = await db.draft.findUnique({
                where: {
                    id,
                    userId: user.id,
                },
            });
        }

        if (!draft) {
            throw new HTTPException(404, {
                message: "Draft not found",
            });
        }

        let options: PostGenOptions = {
            draftId: draft.id,
            message,
            forceWeb,
            images: base64Images.length > 0 ? base64Images : undefined,
        };

        if (version) {
            options.version = version;
        }

        try {
            if (platform === "all") {
                const [xPostGenResult, linkedinPostGenResult] =
                    await Promise.all([
                        postGen(options, "X"),
                        postGen(options, "LINKEDIN"),
                    ]);

                return stream(c, async stream => {
                    await Promise.all([
                        // LinkedIn stream
                        (async () => {
                            for await (const chunk of linkedinPostGenResult.stream()) {
                                await stream.write(
                                    JSON.stringify({
                                        draftId: draft.id,
                                        platform: "linkedin",
                                        ...chunk,
                                    }),
                                );
                            }
                        })(),
                        // X stream
                        (async () => {
                            for await (const chunk of xPostGenResult.stream()) {
                                await stream.write(
                                    JSON.stringify({
                                        draftId: draft.id,
                                        platform: "x",
                                        ...chunk,
                                    }),
                                );
                            }
                        })(),
                    ]);
                    stream.close();
                });
            }
            const postGenResult = await postGen(
                options,
                platform.toUpperCase() as "X" | "LINKEDIN",
            );

            return stream(c, async stream => {
                for await (const chunk of postGenResult.stream()) {
                    await stream.write(
                        JSON.stringify({
                            draftId: draft.id,
                            platform,
                            ...chunk,
                        }),
                    );
                }
                stream.close();
            });
        } catch (error) {
            throw new HTTPException(500, {
                message: "Failed to generate post",
            });
        }
    },
);

export default postGenController;
