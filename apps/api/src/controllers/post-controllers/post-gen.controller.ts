import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { postGen, type PostGenOptions } from "@repo/ai";
import { stream } from "hono/streaming";
import type { Draft } from "@prisma/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const bodySchema = z.object({
    id: z.string().optional(),
    platform: z.enum(["linkedin", "x", "all"]),
    message: z.string(),
    images: z
        .union([
            z.instanceof(File),
            z.array(z.instanceof(File))
        ])
        .optional()
        .transform((val) => {
            if (!val) return undefined;
            return Array.isArray(val) ? val : [val];
        })
        .refine(
            (files) => {
                if (!files) return true;
                return files.every(file => file.size <= MAX_FILE_SIZE);
            },
            { message: "Each image must be less than 5MB" }
        )
        .refine(
            (files) => {
                if (!files) return true;
                return files.every(file => ALLOWED_TYPES.includes(file.type));
            },
            { message: "Only PNG, JPEG, and WEBP images are allowed" }
        ),
    forceWeb: z.boolean().default(false),
    version: z.number().min(0).optional(),
});

const bodySchemaValidator = zValidator("form", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: "Invalid Body: " + result.error.errors.map(e => e.message).join(", "),
        });
    }
});

// Helper function to convert file to base64 URL
const fileToBase64 = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    return `data:${file.type};base64,${base64}`;
};

const postGenController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const { id, message, forceWeb, version, platform, images } = c.req.valid("form");

        // Convert images to base64 URLs
        let base64Images: string[] = [];
        if (images && images.length > 0) {
            try {
                base64Images = await Promise.all(
                    images.map(file => fileToBase64(file))
                );
            } catch (error) {
                throw new HTTPException(500, {
                    message: "Failed to process images",
                });
            }
        }

        let draft: Draft | null = null;

        if (!id) {
            draft = await db.draft.create({
                data: {}
            });
        } else {
            draft = await db.draft.findUnique({
                where: {
                    id,
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

        if (platform === "all") {
            const [xPostGenResult, linkedinPostGenResult] = await Promise.all([
                postGen(options, "x"),
                postGen(options, "linkedin")
            ]);
            
            return stream(c, async stream => {
                console.log("Streaming all posts");
                await Promise.allSettled([
                    // LinkedIn stream  
                    (async () => {
                        for await (const chunk of linkedinPostGenResult.stream()) {
                            console.log("Streaming LinkedIn post", chunk);
                            await stream.write(
                                JSON.stringify({ 
                                    draftId: draft.id, 
                                    platform: "linkedin", 
                                    ...chunk 
                                })
                            );
                        }
                    })(),
                    // X stream
                    (async () => {
                        for await (const chunk of xPostGenResult.stream()) {
                            console.log("Streaming X post", chunk);
                            await stream.write(
                                JSON.stringify({ 
                                    draftId: draft.id, 
                                    platform: "x", 
                                    ...chunk 
                                })
                            );
                        }
                    })(),
                ]);
                console.log("All posts streamed");
                stream.close();
            });
        }
        const postGenResult = await postGen(options, platform);

        return stream(c, async stream => {
            for await (const chunk of postGenResult.stream()) {
                console.log("Streaming post", chunk);
                await stream.write(
                    JSON.stringify({ draftId: draft.id, platform, ...chunk }),
                );
            }
            stream.close();
        });
    },
);

export default postGenController;
