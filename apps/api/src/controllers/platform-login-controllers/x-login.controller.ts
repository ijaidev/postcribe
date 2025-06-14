import db from "@repo/db";
import factory from "../../utils/factory";
import { generateAuthURL } from "@repo/x";
import ApiResponse from "../../utils/api-response";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";

const xLoginSchema = z.object({
    name: z
        .string({ message: "Name is required" })
        .min(1, { message: "Name is required" }),
});

const bodyValidator = zValidator("json", xLoginSchema);

const xLoginHandler = factory.createHandlers(bodyValidator, async c => {
    const { name } = c.req.valid("json");
    const user = c.get("user")!;

    try {
        const state = uuidv4();
        
        // Generate OAuth2 auth URL with proper code verifier
        const authData = await generateAuthURL(state);
        console.log(authData);
        
        // Store the OAuth2 data in database including code verifier
        await db.socialLogin.create({
            data: {
                userId: user.id,
                name,
                state: authData.state,
                provider: "X",
                accessToken: authData.codeVerifier, // Temporarily store code verifier in accessToken field
                refreshToken: "",
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            },
        });

        return c.json(
            new ApiResponse({
                data: {
                    authUrl: authData.url,
                },
                message: "Login url generated successfully",
            }),
            200,
        );
    } catch (error) {
        logger.error("X login error:", error);
        throw new HTTPException(500, {
            message: "Internal server error",
        });
    }
});

export default xLoginHandler;