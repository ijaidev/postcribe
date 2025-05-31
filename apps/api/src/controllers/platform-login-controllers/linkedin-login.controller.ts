import db from "@repo/db";
import factory from "../../utils/factory";
import { generateAuthURL } from "@repo/linkedin";
import ApiResponse from "../../utils/api-response";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";

const linkedinLoginSchema = z.object({
    name: z
        .string({ message: "Name is required" })
        .min(1, { message: "Name is required" }),
});

const bodyValidator = zValidator("json", linkedinLoginSchema);

const linkedinLoginHandler = factory.createHandlers(bodyValidator, async c => {
    const { name } = c.req.valid("json");
    const user = c.get("user")!;

    try {
        const state = uuidv4();
        
        // Generate OAuth2 auth URL
        const authData = generateAuthURL(state);
        
        // Store the OAuth2 data in database
        await db.socialLogin.create({
            data: {
                userId: user.id,
                name,
                state: authData.state,
                provider: "LINKEDIN",
                accessToken: "", // Will be set after callback
                refreshToken: "",
                expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
            },
        });

        return c.json(
            new ApiResponse({
                data: {
                    authUrl: authData.authUrl,
                },
                statusCode: 200,
                message: "LinkedIn login url generated successfully",
            }),
            200,
        );
    } catch (error) {
        logger.error("LinkedIn login error:", error);
        throw new HTTPException(500, {
            message: "Internal server error",
        });
    }
});

export default linkedinLoginHandler; 