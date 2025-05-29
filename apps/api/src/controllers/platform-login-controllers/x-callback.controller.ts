import db from "@repo/db";
import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { xAuthClient, xClient } from "@repo/x";
import { z } from "zod";
import { zValidator as zv } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";

const querySchema = z.object({
    code: z.string(),
    state: z.string(),
});
const queryValidator = zv("query", querySchema);

const xCallbackHandler = factory.createHandlers(queryValidator, async c => {
    const { code, state } = c.req.valid("query");
    const user = c.get("user")!;
    const socialLogin = await db.socialLogin.findFirst({
        where: {
            state: state as string,
            userId: user.id,
        },
    });

    if (!socialLogin) {
        throw new HTTPException(400, {
            message: "Invalid state",
        });
    }

    const { token } = await xAuthClient.requestAccessToken(code);

    const updatedSocialLogin = await db.socialLogin.update({
        where: {
            id: socialLogin.id,
        },
        data: {
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            expiresAt: new Date(
                token.expires_at || Date.now() + 3600000,
            ).toISOString(),
        },
        select: {
            name: true,
            provider: true,
        },
    });

    const data = {
        name: updatedSocialLogin.name,
        provider: updatedSocialLogin.provider,
    };
    
    return c.json(
        new ApiResponse<typeof data>({
            data,
            statusCode: 200,
            message: "Login successful",
        }),
        200,
    );
});

export default xCallbackHandler;
