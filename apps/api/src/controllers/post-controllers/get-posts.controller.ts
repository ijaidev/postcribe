import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import factory from "../../utils/factory";
import { getPosts } from "@repo/ai";

const getPostsSchema = z.object({
    draftId: z.string(),
});

const queryValidator = zValidator("query", getPostsSchema);

const getPostsController = factory.createHandlers(queryValidator, async (c) => {
    const { draftId } = c.req.valid("query");
    const posts = await getPosts({ draftId });
    return c.json(posts);
});

export default getPostsController;