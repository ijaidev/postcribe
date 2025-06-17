// import * as fs from "fs";
// import { createUserClient } from "../client";
// import { logger } from "@repo/logger";

// export interface MediaUploadResult {
//     media_id: string;
//     media_id_string: string;
//     size: number;
//     expires_after_secs: number;
//     image?: {
//       image_type: string;
//       w: number;
//       h: number;
//     };
//     video?: {
//       video_type: string;
//     };
//   }

// /**
//  * Upload media to X (Twitter) using twitter-api-v2 v2 API from file path
//  * @param filePath - Absolute path to the media file
//  * @param accessToken - User's OAuth2 access token
//  * @param altText - Optional alt text for accessibility
//  * @returns Promise with media upload result
//  */
// export async function uploadMedia(
//     filePath: string,
//     accessToken: string,
//     altText?: string
//   ): Promise<MediaUploadResult> {
//     try {
//       // Check if file exists
//       if (!fs.existsSync(filePath)) {
//         throw new Error(`File not found: ${filePath}`);
//       }

//       // Create client for media upload with OAuth2
//       const client = createUserClient(accessToken);

//       // Read file into buffer
//       const mediaBuffer = fs.readFileSync(filePath);

//       // Determine MIME type based on file extension
//       const getFileType = (path: string): string => {
//         const ext = path.toLowerCase().split('.').pop();
//         const mimeTypes: Record<string, string> = {
//           'jpg': 'image/jpeg',
//           'jpeg': 'image/jpeg',
//           'png': 'image/png',
//           'gif': 'image/gif',
//           'webp': 'image/webp',
//           'mp4': 'video/mp4',
//           'mov': 'video/quicktime',
//           'avi': 'video/x-msvideo',
//         };
//         return mimeTypes[ext || ''] || 'application/octet-stream';
//       };

//       const mediaType = getFileType(filePath);

//       // Upload media using v2 API
//       const mediaId = await client.v2.uploadMedia(mediaBuffer, {
//         media_type: mediaType as any,
//       });

//       // Add alt text if provided
//       if (altText) {
//         await client.v2.createMediaMetadata(mediaId, {
//           alt_text: { text: altText }
//         });
//       }

//       // Get file stats
//       const fileStats = fs.statSync(filePath);

//       return {
//         media_id: mediaId,
//         media_id_string: mediaId,
//         size: fileStats.size,
//         expires_after_secs: 86400, // 24 hours default
//       };
//     } catch (error) {
//       logger.error({ error }, "Error uploading media");
//       throw error;
//     }
//   }

// /**
//  * Upload media to X (Twitter) using buffer (for streaming uploads)
//  * @param mediaBuffer - Buffer containing the media data
//  * @param mediaType - MIME type of the media
//  * @param accessToken - User's OAuth2 access token
//  * @param altText - Optional alt text for accessibility
//  * @returns Promise with media upload result
//  */
// export async function uploadMediaBuffer(
//     mediaBuffer: Buffer,
//     mediaType: string,
//     accessToken: string,
//     altText?: string,
//     expiresAfterSecs?: number
// ): Promise<MediaUploadResult> {
//     try {
//         // Validate buffer
//         if (!mediaBuffer || mediaBuffer.length === 0) {
//             throw new Error('Invalid or empty media buffer');
//         }

//         // Create client for media upload with OAuth2
//         const client = createUserClient(accessToken);

//         // Upload media using v2 API
//         const mediaId = await client.v2.uploadMedia(mediaBuffer, {
//             media_type: mediaType as any,
//         });

//         // Add alt text if provided (only for images)
//         if (altText && mediaType.startsWith('image/')) {
//             await client.v2.createMediaMetadata(mediaId, {
//                 alt_text: { text: altText }
//             });
//         }

//         return {
//             media_id: mediaId,
//             media_id_string: mediaId,
//             size: mediaBuffer.length,
//             expires_after_secs: expiresAfterSecs || 1000 * 60 * 60 * 24, // 1 day default
//         };
//     } catch (error) {
//         logger.error({ error }, "Error uploading media buffer");
//         throw error;
//     }
// }
