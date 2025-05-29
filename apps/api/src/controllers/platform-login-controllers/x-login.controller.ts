import db from "@repo/db";
import factory from "../../utils/factory";
import { xAuthClient } from "@repo/x";
import ApiResponse from "../../utils/api-response";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const xLoginSchema = z.object({
    name: z
        .string({ message: "Name is required" })
        .min(1, { message: "Name is required" }),
});

const bodyValidator = zValidator("json", xLoginSchema);

const xLoginHandler = factory.createHandlers(bodyValidator, async c => {
    const { name } = c.req.valid("json");
    const user = c.get("user")!;

    const state = uuidv4();
    await db.socialLogin.create({
        data: {
            userId: user.id,
            name,
            state,
            provider: "X",
            accessToken: "",
            refreshToken: "",
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
        },
    });
    const authUrl = xAuthClient.generateAuthURL({
        state,
        code_challenge_method: "s256",
    });
    return c.json(
        new ApiResponse({
            data: {
                authUrl,
            },
            statusCode: 200,
            message: "Login url generated successfully",
        }),
        200,
    );
});


export default xLoginHandler;