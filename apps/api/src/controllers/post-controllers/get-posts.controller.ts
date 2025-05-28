import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import factory from "../../utils/factory";
import { getPosts, type GetPostsResponse } from "@repo/ai";
import ApiResponse from "../../utils/api-response";
import db from "@repo/db";
import { HTTPException } from "hono/http-exception";

const getPostsSchema = z.object({
    draftId: z.string(),
});

const queryValidator = zValidator("query", getPostsSchema);

const getPostsController = factory.createHandlers(queryValidator, async c => {
    const { draftId } = c.req.valid("query");
    const user = c.get("user")!;
    const draft = await db.draft.findUnique({
        where: {
            id: draftId,
            userId: user.id,
            isDeleted: false,
        },
    });
    if (!draft) {
        throw new HTTPException(404, {
            message: "Draft not found",
        });
    }
    const posts = await getPosts({ draftId: draft.id });
    return c.json(
        new ApiResponse<GetPostsResponse>({
            statusCode: 200,
            message: "Posts fetched successfully",
            data: posts,
        }),
        200,
    );
});

export default getPostsController;
