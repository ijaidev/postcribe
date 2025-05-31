import { createLinkedInClient } from "../client";

export interface LinkedInMediaUploadResult {
    asset: string; // Asset URN
    uploadUrl?: string;
    status: string;
}

/**
 * Upload image media to LinkedIn
 * @param imageBuffer - Image buffer data
 * @param mimeType - MIME type of the image
 * @param accessToken - LinkedIn access token
 * @param personUrn - Person URN for the upload
 * @returns Upload result with asset URN
 */
export async function uploadImage(
    imageBuffer: Buffer,
    mimeType: string,
    accessToken: string,
    personUrn: string
): Promise<LinkedInMediaUploadResult> {
    try {
        const client = createLinkedInClient();

        // Step 1: Register the upload
        const registerUploadRequest = {
            registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: personUrn,
                serviceRelationships: [
                    {
                        relationshipType: "OWNER",
                        identifier: "urn:li:userGeneratedContent",
                    },
                ],
            },
        };

        const registerResponse = await client.action({
            resourcePath: "/assets",
            actionName: "registerUpload",
            data: registerUploadRequest,
            accessToken,
        });

        const responseValue = registerResponse.data.value as any;
        const asset = responseValue.asset;
        const uploadInstructions = responseValue.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ];

        // Step 2: Upload the image to the provided URL
        const uploadUrl = uploadInstructions.uploadUrl;
        const headers = uploadInstructions.headers || {};

        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": mimeType,
            },
            body: imageBuffer,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Upload failed with status: ${uploadResponse.status}`);
        }

        return {
            asset,
            uploadUrl,
            status: "SUCCESS",
        };
    } catch (error) {
        console.error("Error uploading image to LinkedIn:", error);

        if (error instanceof Error) {
            if (error.message.includes("401") || error.message.includes("unauthorized")) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (error.message.includes("403") || error.message.includes("forbidden")) {
                throw new Error("Insufficient permissions to upload media to LinkedIn");
            }

            if (error.message.includes("413") || error.message.includes("too large")) {
                throw new Error("Image file is too large for LinkedIn upload");
            }
        }

        throw new Error("Failed to upload image to LinkedIn");
    }
}

/**
 * Upload video media to LinkedIn
 * @param videoBuffer - Video buffer data
 * @param mimeType - MIME type of the video
 * @param accessToken - LinkedIn access token
 * @param personUrn - Person URN for the upload
 * @returns Upload result with asset URN
 */
export async function uploadVideo(
    videoBuffer: Buffer,
    mimeType: string,
    accessToken: string,
    personUrn: string
): Promise<LinkedInMediaUploadResult> {
    try {
        const client = createLinkedInClient();

        // Step 1: Register the upload for video
        const registerUploadRequest = {
            registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-video"],
                owner: personUrn,
                serviceRelationships: [
                    {
                        relationshipType: "OWNER",
                        identifier: "urn:li:userGeneratedContent",
                    },
                ],
                supportedUploadMechanism: ["SYNCHRONOUS_UPLOAD"],
            },
        };

        const registerResponse = await client.action({
            resourcePath: "/assets",
            actionName: "registerUpload",
            data: registerUploadRequest,
            accessToken,
        });

        const responseValue = registerResponse.data.value as any;
        const asset = responseValue.asset;
        const uploadInstructions = responseValue.uploadMechanism[
            "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
        ];

        // Step 2: Upload the video to the provided URL
        const uploadUrl = uploadInstructions.uploadUrl;
        const headers = uploadInstructions.headers || {};

        const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                ...headers,
                "Content-Type": mimeType,
            },
            body: videoBuffer,
        });

        if (!uploadResponse.ok) {
            throw new Error(`Video upload failed with status: ${uploadResponse.status}`);
        }

        return {
            asset,
            uploadUrl,
            status: "SUCCESS",
        };
    } catch (error) {
        console.error("Error uploading video to LinkedIn:", error);

        if (error instanceof Error) {
            if (error.message.includes("401") || error.message.includes("unauthorized")) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (error.message.includes("403") || error.message.includes("forbidden")) {
                throw new Error("Insufficient permissions to upload video to LinkedIn");
            }

            if (error.message.includes("413") || error.message.includes("too large")) {
                throw new Error("Video file is too large for LinkedIn upload");
            }
        }

        throw new Error("Failed to upload video to LinkedIn");
    }
}

/**
 * Upload media buffer to LinkedIn (auto-detects type)
 * @param mediaBuffer - Media buffer data
 * @param mimeType - MIME type of the media
 * @param accessToken - LinkedIn access token
 * @param personUrn - Person URN for the upload
 * @returns Upload result with asset URN
 */
export async function uploadMediaBuffer(
    mediaBuffer: Buffer,
    mimeType: string,
    accessToken: string,
    personUrn: string
): Promise<LinkedInMediaUploadResult> {
    if (mimeType.startsWith("image/")) {
        return uploadImage(mediaBuffer, mimeType, accessToken, personUrn);
    } else if (mimeType.startsWith("video/")) {
        return uploadVideo(mediaBuffer, mimeType, accessToken, personUrn);
    } else {
        throw new Error(`Unsupported media type: ${mimeType}`);
    }
} 