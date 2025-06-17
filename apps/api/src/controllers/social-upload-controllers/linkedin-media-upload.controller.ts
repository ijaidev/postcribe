// import factory from "../../utils/factory";
// import ApiResponse from "../../utils/api-response";
// import {
//     uploadMediaBuffer,
//     getValidAccessToken,
//     getProfile,
//     type LinkedInMediaUploadResult,
// } from "@repo/linkedin";
// import { HTTPException } from "hono/http-exception";
// import db from "@repo/db";
// import { z } from "zod";
// import { zValidator as zv } from "@hono/zod-validator";

// const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB for LinkedIn
// const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5GB for LinkedIn videos
// const ALLOWED_TYPES = [
//     "image/png",
//     "image/jpeg",
//     "image/gif",
//     "video/mp4",
//     "video/quicktime",
//     "video/x-msvideo"
// ];

// const schema = z.object({
//     file: z
//         .instanceof(File)
//         .refine(file => file.size > 0, {
//             message: "File is required",
//         })
//         .refine(file => ALLOWED_TYPES.includes(file.type), {
//             message: "Only PNG, JPEG, GIF images and MP4, MOV, AVI videos are allowed",
//         })
//         .refine(file => {
//             if (file.type.startsWith("image/")) {
//                 return file.size <= MAX_IMAGE_SIZE;
//             }
//             return file.size <= MAX_VIDEO_SIZE;
//         }, {
//             message: "File size too large. Images must be ≤20MB, videos ≤5GB",
//         }),

//     socialLoginId: z.string(),
//     draftId: z.string(),
// });

// const validate = zv("form", schema);

// const linkedinMediaUploadHandler = factory.createHandlers(validate, async c => {
//     const { file, socialLoginId, draftId } = c.req.valid("form");

//     try {
//         const tokenResult = await getValidAccessToken(socialLoginId);

//         // Get user profile to obtain personUrn
//         const profile = await getProfile(tokenResult.accessToken);
//         const personUrn = `urn:li:person:${profile.id}`;

//         const arrayBuffer = await file.arrayBuffer();
//         const mediaBuffer = Buffer.from(arrayBuffer);

//         const uploadResult = await uploadMediaBuffer(
//             mediaBuffer,
//             file.type,
//             tokenResult.accessToken,
//             personUrn
//         );

//         const socialLogin = await db.socialLogin.findUnique({
//             where: {
//                 id: socialLoginId,
//             },
//         });

//         if (!socialLogin) {
//             throw new HTTPException(404, {
//                 message: "Social account not found",
//             });
//         }

//         const draft = await db.draft.findUnique({
//             where: {
//                 id: draftId,
//             },
//             include: {
//                 posts: true,
//             },
//         });

//         if (!draft) {
//             throw new HTTPException(404, {
//                 message: "Draft not found",
//             });
//         }

//         const postId = draft?.posts.find(post => post.postType === "LINKEDIN")?.id;

//         const post = await db.post.upsert({
//             where: {
//                 id: postId || "new",
//             },
//             update: {
//                 mediaIds: [uploadResult.asset],
//             },
//             create: {
//                 post: "",
//                 mediaIds: [uploadResult.asset],
//                 postType: "LINKEDIN",
//                 draftId: draftId,
//                 socialLoginId: socialLogin.id,
//             },
//         });

//         return c.json(
//             new ApiResponse({
//                 statusCode: 200,
//                 message: "Media uploaded successfully to LinkedIn",
//                 data: {
//                     assetUrn: uploadResult.asset,
//                     status: uploadResult.status,
//                 },
//             }),
//             200,
//         );

//     } catch (error) {
//         console.error("Error in LinkedIn media upload:", error);

//         if (error instanceof HTTPException) {
//             throw error;
//         }

//         // Handle specific error types
//         if (error instanceof Error) {
//             if (
//                 error.message.includes("not connected") ||
//                 error.message.includes("not found")
//             ) {
//                 throw new HTTPException(404, {
//                     message: error.message,
//                 });
//             }

//             if (
//                 error.message.includes("refresh") ||
//                 error.message.includes("re-authenticate")
//             ) {
//                 throw new HTTPException(401, {
//                     message: error.message,
//                 });
//             }

//             if (error.message.includes("media") || error.message.includes("upload")) {
//                 throw new HTTPException(400, {
//                     message: error.message,
//                 });
//             }

//             if (
//                 error.message.includes("token") ||
//                 error.message.includes("auth") ||
//                 error.message.includes("unauthorized")
//             ) {
//                 throw new HTTPException(401, {
//                     message:
//                         "Authentication failed. Please reconnect your LinkedIn account.",
//                 });
//             }

//             if (error.message.includes("forbidden")) {
//                 throw new HTTPException(403, {
//                     message: "Insufficient permissions. Please reconnect your LinkedIn account with proper permissions.",
//                 });
//             }
//         }

//         throw new HTTPException(500, {
//             message: "Failed to upload media to LinkedIn",
//         });
//     }
// });

// export default linkedinMediaUploadHandler;
