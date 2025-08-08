// import db from "@repo/db";
// import factory from "../../utils/factory";
// import ApiResponse from "../../utils/api-response";
// import { requestAccessToken, getProfile } from "@repo/linkedin";
// import { HTTPException } from "hono/http-exception";
// import { logger } from "@repo/logger";
// import { CLIENT_URL } from "../../config";

// const linkedinCallbackHandler = factory.createHandlers(async c => {
//     const { code, state, error, error_description } = c.req.query();
//     const user = c.get("user")!;

//     try {
//         if (error || !code || !state) {
//             logger.error(
//                 { error, error_description },
//                 "Failed to connect LinkedIn account",
//             );
//             throw new HTTPException(400, {
//                 message: "Failed to connect LinkedIn account",
//             });
//         }
//         // Find the social login record with the provided state
//         const socialLogin = await db.socialLogin.findFirst({
//             where: {
//                 state: state as string,
//                 userId: user.id,
//                 provider: "LINKEDIN",
//             },
//         });

//         if (!socialLogin) {
//             throw new HTTPException(400, {
//                 message: "Invalid state or session expired",
//             });
//         }

//         // Exchange the authorization code for access tokens
//         const tokenResult = await requestAccessToken(code);

//         // Calculate expiration time
//         const expiresAt = tokenResult.expiresIn
//             ? new Date(Date.now() + tokenResult.expiresIn * 1000).toISOString()
//             : new Date(Date.now() + 3600000).toISOString(); // Default to 1 hour

//         // Get LinkedIn user profile information
//         let linkedInProfile;
//         try {
//             linkedInProfile = await getProfile(tokenResult.accessToken);
//         } catch (profileError) {
//             logger.error({ profileError }, "Failed to fetch LinkedIn profile");
//             // Continue with basic token update if profile fetch fails
//             linkedInProfile = null;
//         }

//         // Generate username from profile or fallback to account name
//         const userName = linkedInProfile
//             ? linkedInProfile.vanityName ||
//               `${linkedInProfile.firstName} ${linkedInProfile.lastName}`.trim()
//             : socialLogin.name;

//         // Update the social login record with actual tokens and profile info
//         const updatedSocialLogin = await db.socialLogin.update({
//             where: {
//                 id: socialLogin.id,
//             },
//             data: {
//                 accessToken: tokenResult.accessToken,
//                 refreshToken: tokenResult.refreshToken || "",
//                 expiresAt: expiresAt,
//                 state: null, // Clear the state as it's no longer needed
//                 userName: userName,
//                 isConnected: true,
//             },
//             select: {
//                 name: true,
//                 provider: true,
//                 id: true,
//                 userName: true,
//                 isConnected: true,
//             },
//         });

//         const data = {
//             name: updatedSocialLogin.name,
//             provider: updatedSocialLogin.provider,
//             id: updatedSocialLogin.id,
//             userName: updatedSocialLogin.userName,
//             isConnected: updatedSocialLogin.isConnected,
//         };

//         // Return HTML that sends postMessage to parent window and closes popup
//         const successHtml = `
//                 <!DOCTYPE html>
//                 <html>
//                 <head>
//                     <title>LinkedIn Authorization Success</title>
//                 </head>
//                 <body>
//                     <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
//                         <h2>✅ LinkedIn Connected Successfully!</h2>
//                         <p>You can close this window...</p>
//                     </div>
//                     <script>
//                         // Send success message to parent window
//                         if (window.opener && window.opener !== window) {
//                             window.opener.postMessage({
//                                 type: 'LINKEDIN_AUTH_SUCCESS',
//                                 account: ${JSON.stringify(data)}
//                             }, '${CLIENT_URL}');
//                             window.close();
//                         } else {
//                             // Fallback for standalone access
//                             setTimeout(() => {
//                                 window.location.href = '${CLIENT_URL}/connections';
//                             }, 2000);
//                         }
//                     </script>
//                 </body>
//                 </html>
//             `;

//         return c.html(successHtml);
//     } catch (error) {
//         logger.error({ error }, "LinkedIn callback error");

//         const errorMessage =
//             error instanceof HTTPException
//                 ? error.message
//                 : "Failed to complete LinkedIn authentication";

//         // Return HTML that sends error message to parent window
//         const errorHtml = `
//                 <!DOCTYPE html>
//                 <html>
//                 <head>
//                     <title>LinkedIn Authorization Error</title>
//                 </head>
//                 <body>
//                     <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
//                         <h2>❌ LinkedIn Connection Failed</h2>
//                         <p>${errorMessage}</p>
//                         <p>You can close this window...</p>
//                     </div>
//                                             <script>
//                             // Send error message to parent window
//                             if (window.opener && window.opener !== window) {
//                                 window.opener.postMessage({
//                                     type: 'LINKEDIN_AUTH_ERROR',
//                                     error: '${errorMessage}'
//                                 }, '${CLIENT_URL}');
//                                 window.close();
//                             } else {
//                                 // Fallback for standalone access
//                                 setTimeout(() => {
//                                     window.location.href = '${CLIENT_URL}/connections';
//                                 }, 2000);
//                             }
//                         </script>
//                 </body>
//                 </html>
//             `;

//         return c.html(errorHtml);
//     }
// });

// export default linkedinCallbackHandler;
