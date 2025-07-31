import { generateNameWithDraftId } from "@repo/ai";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import factory from "../../utils/factory";
import db from "@repo/db";
import { getZodErrorMessage } from "../../utils/zod-error-message";
import ApiResponse from "../../utils/api-response";
import { logger } from "@repo/logger";

const schema = z.object({
    draftId: z.string().min(1),
});

const zv = zValidator("json", schema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: getZodErrorMessage(result.error),
        });
    }
});

const nameGenHandler = factory.createHandlers(zv, async c => {
    const { draftId } = c.req.valid("json");
    const user = c.get("user")!;

    try {
        const draft = await db.draft.findUnique({
            where: {
                id: draftId,
                userId: user.id,
            },
        });

        if (!draft) {
            throw new HTTPException(404, {
                message: "Draft not found",
            });
        }

        if ((draft.title && draft.title !== "Untitled") || !draft.platform) {
            return c.json(
                new ApiResponse({
                    data: {
                        name: draft.title,
                    },
                    message: "Draft title is already set",
                    status: 200,
                }),
                200,
            );
        }

        const name = await generateNameWithDraftId(draftId, draft.platform);

        const updatedDraft = await db.draft.update({
            where: {
                id: draftId,
            },
            data: {
                title: name,
            },
        });

        if (!updatedDraft.title) {
            throw new HTTPException(500, {
                message: "Internal server error, please try again later",
            });
        }

        return c.json(
            new ApiResponse({
                data: {
                    name: updatedDraft.title,
                },
                message: "Name generated successfully",
                status: 200,
            }),
            200,
        );
    } catch (err) {
        logger.error({ err }, "Error generating name");
        throw new HTTPException(500, {
            message: "Internal server error, please try again later",
        });
    }
});

export default nameGenHandler;
