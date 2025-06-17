// import db from "@repo/db";
// import factory from "../../utils/factory";
// import ApiResponse from "../../utils/api-response";
// import { requestAccessToken } from "@repo/x";
// import { z } from "zod";
// import { zValidator as zv } from "@hono/zod-validator";
// import { HTTPException } from "hono/http-exception";
// import { logger } from "@repo/logger";

// const querySchema = z.object({
//     code: z.string(),
//     state: z.string(),
// });
// const queryValidator = zv("query", querySchema);

// const xCallbackHandler = factory.createHandlers(queryValidator, async c => {
//     const { code, state } = c.req.valid("query");
//     const user = c.get("user")!;

//     try {
//         // Find the social login record with the provided state
//         const socialLogin = await db.socialLogin.findFirst({
//             where: {
//                 state: state as string,
//                 userId: user.id,
//                 provider: "X",
//             },
//         });

//         if (!socialLogin) {
//             throw new HTTPException(400, {
//                 message: "Invalid state or session expired",
//             });
//         }

//         // Retrieve the code verifier from the accessToken field (where we temporarily stored it)
//         const codeVerifier = socialLogin.accessToken;

//         if (!codeVerifier) {
//             throw new HTTPException(400, {
//                 message: "Code verifier not found",
//             });
//         }

//         // Exchange the authorization code for access tokens
//         const tokenResult = await requestAccessToken(code, codeVerifier);

//         // Calculate expiration time
//         const expiresAt = tokenResult.expiresIn
//             ? new Date(Date.now() + (tokenResult.expiresIn * 1000)).toISOString()
//             : new Date(Date.now() + 7200000).toISOString(); // Default to 2 hours

//         // Update the social login record with actual tokens
//         const updatedSocialLogin = await db.socialLogin.update({
//             where: {
//                 id: socialLogin.id,
//             },
//             data: {
//                 accessToken: tokenResult.accessToken,
//                 refreshToken: tokenResult.refreshToken || "",
//                 expiresAt: expiresAt,
//                 state: null, // Clear the state as it's no longer needed
//             },
//             select: {
//                 name: true,
//                 provider: true,
//             },
//         });

//         const data = {
//             name: updatedSocialLogin.name,
//             provider: updatedSocialLogin.provider,
//         };

//         return c.json(
//             new ApiResponse<typeof data>({
//                 data,
//                 message: "X login successful",
//             }),
//             200,
//         );
//     } catch (error) {
//         logger.error("X callback error:", error);
//         throw new HTTPException(500, {
//             message: "Failed to complete X authentication",
//         });
//     }
// });

// export default xCallbackHandler;
