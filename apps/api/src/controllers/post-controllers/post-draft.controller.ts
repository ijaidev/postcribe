import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import {
    uploadMediaBuffer,
    getValidAccessToken,
} from "@repo/x";
import { HTTPException } from "hono/http-exception";
import db from "@repo/db";
import { z } from "zod";
import { zValidator as zv } from "@hono/zod-validator";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const schema = z.object({
    action: z.enum(["post", "schedule"]),
    scheduleDate: z.string().datetime().optional(),
    updatedPost: z.string().optional(),
    file: z
        .instanceof(File)
        .refine(file => file.size > 0, {
            message: "File is required",
        })
        .refine(file => file.type.startsWith("image/"), {
            message: "File must be an image",
        })
        .refine(file => file.size <= MAX_FILE_SIZE, {
            message: "File size must be less than 5MB",
        })
        .refine(file => ALLOWED_TYPES.includes(file.type), {
            message: "Only PNG, JPEG, and WEBP images are allowed",
        }),

    altText: z.string().optional(),
    socialLoginId: z.array(
        z.object({
            id: z.string(),
            platform: z
                .enum(["x", "linkedin"])
                .transform(val => val.toUpperCase()),
        }),
    ),
    draftId: z.string(),
});

const validate = zv("form", schema);

const postDraftHandler = factory.createHandlers(validate, async c => {
    const {
        file,
        altText,
        socialLoginId,
        draftId,
        updatedPost,
        action,
        scheduleDate,
    } = c.req.valid("form");

    try {
        const arrayBuffer = await file.arrayBuffer();
        const mediaBuffer = Buffer.from(arrayBuffer);

        const expiresAfterSecs =
            action === "schedule" && scheduleDate
                ? new Date(scheduleDate).getTime() - new Date().getTime()
                : undefined;

        // Get the first social login for X platform
        const xSocialLogin = socialLoginId.find(login => login.platform === "X");
        if (!xSocialLogin) {
            throw new HTTPException(400, {
                message: "No X social login provided",
            });
        }

        const socialLogin = await db.socialLogin.findUnique({
            where: {
                id: xSocialLogin.id,
            },
        });

        if (!socialLogin) {
            throw new HTTPException(404, {
                message: "Social account not found",
            });
        }

        const tokenResult = await getValidAccessToken(socialLogin.id);

        const uploadResult = await uploadMediaBuffer(
            mediaBuffer,
            file.type,
            tokenResult.accessToken,
            altText,
            expiresAfterSecs,
        );

        const draft = await db.draft.findUnique({
            where: {
                id: draftId,
            },
            include: {
                posts: true,
            },
        });

        if (!draft) {
            throw new HTTPException(404, {
                message: "Draft not found",
            });
        }
        const postId = draft?.posts.find(post => post.postType === "X")?.id;

        const post = await db.post.upsert({
            where: {
                id: postId,
            },
            update: {
                mediaIds: [uploadResult.media_id_string],
            },
            create: {
                post: "",
                mediaIds: [uploadResult.media_id_string],
                postType: "X",
                draftId: draftId,
                socialLoginId: socialLogin.id,
            },
        });

        return c.json(
            new ApiResponse({
                statusCode: 200,
                message: "Media uploaded successfully to X",
            }),
            200,
        );
    } catch (error) {
        console.error("Error in X media upload:", error);

        if (error instanceof HTTPException) {
            throw error;
        }

        // Handle specific error types
        if (error instanceof Error) {
            if (
                error.message.includes("not connected") ||
                error.message.includes("not found")
            ) {
                throw new HTTPException(404, {
                    message: error.message,
                });
            }

            if (
                error.message.includes("refresh") ||
                error.message.includes("re-authenticate")
            ) {
                throw new HTTPException(401, {
                    message: error.message,
                });
            }

            if (error.message.includes("media")) {
                throw new HTTPException(400, {
                    message: error.message,
                });
            }

            if (
                error.message.includes("token") ||
                error.message.includes("auth")
            ) {
                throw new HTTPException(401, {
                    message:
                        "Authentication failed. Please reconnect your X account.",
                });
            }
        }

        throw new HTTPException(500, {
            message: "Failed to upload media to X",
        });
    }
});

export default postDraftHandler;
