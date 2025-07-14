import { HTTPException } from "hono/http-exception";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import {
    postGen,
    type PostGenOptions,
    type PostGenStreamResponse,
} from "@repo/ai";
import { streamText } from "hono/streaming";
import type { Draft, Platform, SocialLogin } from "@prisma/client";
import { getZodErrorMessage } from "../../utils/zod-error-message";

const bodySchema = z.object({
    id: z.string().optional(),
    platform: z.enum(["LINKEDIN", "X", "ALL"]),
    xLoginId: z.string().optional(),
    message: z.string(),
    images: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .transform(val => {
            if (!val) return undefined;
            // Ensure it's always an array
            return Array.isArray(val) ? val : [val];
        }),

    forceWeb: z
        .union([z.boolean(), z.string().transform(val => val === "true")])
        .default(false),
});

const bodySchemaValidator = zValidator("json", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

interface PostGenStreamResponseWithPlatform extends PostGenStreamResponse {
    platform: "X" | "LINKEDIN";
}

const postGenController = factory.createHandlers(
    bodySchemaValidator,
    async c => {
        const user = c.get("user")!;
        let { id, message, forceWeb, platform, images, xLoginId } =
            c.req.valid("json");

        // Images are already validated base64 strings from Zod schema
        const base64Images: string[] = images || [];

        let draft: Draft | null = null;

        let xUserId: string | undefined = undefined;

        if (!id) {
            let xAccount: SocialLogin | null = null;
            if (xLoginId) {
                xAccount = await db.socialLogin.findFirst({
                    where: {
                        userId: user.id,
                        provider: "X",
                        id: xLoginId,
                    },
                });
                if (!xAccount) {
                    throw new HTTPException(404, {
                        message: "X account not found",
                    });
                }
                xUserId = xAccount.platformUserId || undefined;
            }
            draft = await db.draft.create({
                data: {
                    userId: user.id,
                    title: "Generated Post Draft",
                    platform: platform as Platform,
                    xLoginId: xAccount?.id || undefined,
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

        if (platform === "X" || platform === "ALL") {
            if (draft?.xLoginId) {
                const xAccount = await db.socialLogin.findFirst({
                    where: {
                        userId: user.id,
                        provider: "X",
                        id: draft.xLoginId,
                    },
                });
                if (xAccount) {
                    xUserId = xAccount.platformUserId || undefined;
                }
            }
        }

        let options: PostGenOptions = {
            draftId: draft.id,
            message,
            forceWeb,
            images: base64Images.length > 0 ? base64Images : undefined,
            xAccountId: xUserId,
        };

        try {
            if (platform === "ALL") {
                const [xPostGenResult, linkedinPostGenResult] =
                    await Promise.all([
                        postGen(options, "X"),
                        postGen(options, "LINKEDIN"),
                    ]);

                return streamText(c, async stream => {
                    await Promise.all([
                        // LinkedIn stream
                        (async () => {
                            await stream.write(
                                JSON.stringify({
                                    draftId: draft.id,
                                    platform: "LINKEDIN",
                                    event: "start",
                                    content: "",
                                } as PostGenStreamResponseWithPlatform) + "\n",
                            );
                            for await (const chunk of linkedinPostGenResult.stream()) {
                                await stream.write(
                                    JSON.stringify({
                                        draftId: draft.id,
                                        platform: "LINKEDIN",
                                        ...chunk,
                                    } as PostGenStreamResponseWithPlatform) +
                                        "\n",
                                );
                            }
                            await stream.write(
                                JSON.stringify({
                                    draftId: draft.id,
                                    platform: "LINKEDIN",
                                    event: "end",
                                    content: "",
                                } as PostGenStreamResponseWithPlatform) + "\n",
                            );
                        })(),
                        // X stream
                        (async () => {
                            await stream.write(
                                JSON.stringify({
                                    draftId: draft.id,
                                    platform: "X",
                                    event: "start",
                                    content: "",
                                } as PostGenStreamResponseWithPlatform) + "\n",
                            );
                            for await (const chunk of xPostGenResult.stream()) {
                                await stream.write(
                                    JSON.stringify({
                                        draftId: draft.id,
                                        platform: "X",
                                        ...chunk,
                                    } as PostGenStreamResponseWithPlatform) +
                                        "\n",
                                );
                            }
                            await stream.write(
                                JSON.stringify({
                                    draftId: draft.id,
                                    platform: "X",
                                    event: "end",
                                    content: "",
                                } as PostGenStreamResponseWithPlatform) + "\n",
                            );
                        })(),
                    ]);
                    stream.close();
                });
            }
            const postGenResult = await postGen(options, platform);

            return streamText(c, async stream => {
                await stream.write(
                    JSON.stringify({
                        draftId: draft.id,
                        platform,
                        event: "start",
                        content: "",
                    } as PostGenStreamResponseWithPlatform) + "\n",
                );
                for await (const chunk of postGenResult.stream()) {
                    await stream.write(
                        JSON.stringify({
                            draftId: draft.id,
                            platform,
                            ...chunk,
                        } as PostGenStreamResponseWithPlatform) + "\n",
                    );
                }
                await stream.write(
                    JSON.stringify({
                        draftId: draft.id,
                        platform,
                        event: "end",
                        content: "",
                    } as PostGenStreamResponseWithPlatform) + "\n",
                );
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
