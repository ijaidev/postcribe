import { HTTPException } from "hono/http-exception";
import ApiResponse from "../../utils/api-response";
import factory from "../../utils/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import db from "@repo/db";
import { postGen, type PostGenOptions } from "@repo/ai";
import { stream, streamText, streamSSE } from "hono/streaming";
import type { Draft } from "@prisma/client";

const bodySchema = z.object({
    id: z.string().optional(),
    message: z.string(),
    forceWeb: z.boolean().default(false),
    version: z.number().min(0).optional(),
});

const bodySchemaValidator = zValidator("json", bodySchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: "Invalid Body",
        });
    }
});

const paramSchema = z.object({
    platform: z.enum(["linkedin", "x"]),
});

const paramSchemaValidator = zValidator("param", paramSchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: "Invalid Platform",
        });
    }
});

const postGenController = factory.createHandlers(
    paramSchemaValidator,
    bodySchemaValidator,
    async c => {
        const { id, message, forceWeb, version } = c.req.valid("json");
        const { platform } = c.req.valid("param");

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
        };

        if (version) {
            options.version = version;
        }

        const postGenResult = await postGen(options, platform);

        return stream(c, async stream => {
            for await (const chunk of postGenResult.stream()) {
                console.log(chunk);
                await stream.write(
                    JSON.stringify({ draftId: draft.id, ...chunk }),
                );
            }
        });
    },
);

export default postGenController;
