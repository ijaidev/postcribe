import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { postGen, type PostGenOptions } from "@repo/ai";
import { stream } from "hono/streaming";
import type { Draft } from "@prisma/client";
import fileToBase64 from "../../utils/file-to-base64";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const bodySchema = z.object({
    id: z.string().optional(),
    platform: z.enum(["linkedin", "x", "all"]),
    message: z.string(),
    images: z
        .union([
            z.instanceof(File),
            z.array(z.instanceof(File)),
            z.string().transform(() => undefined), // Handle string form data
            z.array(z.string()).transform(() => undefined), // Handle array of strings from form data
        ])
        .optional()
        .transform(val => {
            if (!val) return undefined;
            if (val instanceof File) return [val];
            if (Array.isArray(val)) {
                return val.filter((item): item is File => item instanceof File);
            }
            return undefined;
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
            message:
                "Invalid Body: " +
                result.error.errors.map(e => e.message).join(", "),
        });
    }
});

const postGenController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const user = c.get("user")!;
        const { id, message, forceWeb, version, platform, images } =
            c.req.valid("form");

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
