import db from "@repo/db";
import factory from "../../utils/factory";
// import { generateAuthURL } from "@repo/x";
import ApiResponse from "../../utils/api-response";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import { getUserInfo } from "@repo/x";

const xLoginSchema = z.object({
    username: z
        .string({ message: "Username is required" })
        .min(1, { message: "Username is required" }),
});

const bodyValidator = zValidator("json", xLoginSchema, result => {
    if (!result.success) {
        throw new HTTPException(400, {
            message: "Username is required",
        });
    }
});

const xLoginHandler = factory.createHandlers(bodyValidator, async c => {
    const { username } = c.req.valid("json");
    const user = c.get("user")!;

    try {
        // const state = uuidv4();

        // // Generate OAuth2 auth URL with proper code verifier
        // const authData = await generateAuthURL(state);
        // console.log(authData);

        // // Store the OAuth2 data in database including code verifier
        // await db.socialLogin.create({
        //     data: {
        //         userId: user.id,
        //         name,
        //         state: authData.state,
        //         provider: "X",
        //         accessToken: authData.codeVerifier, // Temporarily store code verifier in accessToken field
        //         refreshToken: "",
        //         expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        //     },
        // });

        // return c.json(
        //     new ApiResponse({
        //         data: {
        //             authUrl: authData.url,
        //         },
        //         message: "Login url generated successfully",
        //     }),
        //     200,
        // );

        const xUser = await getUserInfo(username);
        if (xUser.id === "") {
            throw new HTTPException(404, {
                message: "User not found",
            });
        }
        const date = new Date();
        const expiresAt = new Date(date.setFullYear(2100)).toISOString();
        const account = await db.socialLogin.create({
            data: {
                userId: user.id,
                name: username,
                userName: username,
                provider: "X",
                expiresAt: expiresAt,
                isVerified: xUser.isVerified,
                isConnected: true,
            },
            select: {
                id: true,
                name: true,
                userName: true,
                provider: true,
                expiresAt: true,
                isVerified: true,
                isConnected: true,
            },
        });
        return c.json(
            new ApiResponse({
                data: {
                    account: account,
                },
                message: "X login successful",
                status: 200,
            }),
            200,
        );
    } catch (error) {
        logger.error("X login error:", error);

        if (error instanceof HTTPException) {
            throw error;
        }
        throw new HTTPException(500, {
            message: "Internal server error",
        });
    }
});

export default xLoginHandler;
