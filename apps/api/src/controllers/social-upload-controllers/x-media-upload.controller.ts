import factory from "../../utils/factory";
import ApiResponse from "../../utils/api-response";
import { uploadMediaBuffer, getValidAccessTokenById, type MediaUploadResult } from "@repo/x";
import { HTTPException } from "hono/http-exception";

const xMediaUploadHandler = factory.createHandlers(async c => {
    try {
        // Get the uploaded file from form data
        const body = await c.req.parseBody();
        const file = body.file as File;
        const altText = body.altText as string | undefined;
        const socialLoginId = body.socialLoginId as string;
        
        if (!file) {
            throw new HTTPException(400, {
                message: "No file provided"
            });
        }
        
        if (!socialLoginId) {
            throw new HTTPException(400, {
                message: "Social login ID is required"
            });
        }

        // Validate file type
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        
        if (!isImage && !isVideo) {
            throw new HTTPException(400, {
                message: 'File must be an image or video'
            });
        }

        // Validate file size (Twitter limits: 5MB for images, 512MB for videos)
        const maxImageSize = 5 * 1024 * 1024; // 5MB
        const maxVideoSize = 512 * 1024 * 1024; // 512MB
        
        if (isImage && file.size > maxImageSize) {
            throw new HTTPException(400, {
                message: 'Image file size exceeds 5MB limit'
            });
        }
        
        if (isVideo && file.size > maxVideoSize) {
            throw new HTTPException(400, {
                message: 'Video file size exceeds 512MB limit'
            });
        }

        // Get valid access token (with automatic refresh if expired)
        const tokenResult = await getValidAccessTokenById(socialLoginId);

        // Convert file to buffer for streaming upload
        const arrayBuffer = await file.arrayBuffer();
        const mediaBuffer = Buffer.from(arrayBuffer);

        // Stream upload the media file to X using the X package function
        const uploadResult = await uploadMediaBuffer(
            mediaBuffer,
            file.type,
            tokenResult.accessToken,
            altText
        );

        return c.json(
            new ApiResponse<MediaUploadResult & { tokenRefreshed: boolean }>({
                data: {
                    ...uploadResult,
                    tokenRefreshed: tokenResult.isRefreshed,
                },
                statusCode: 200,
                message: tokenResult.isRefreshed 
                    ? "Media uploaded successfully to X (access token was refreshed)"
                    : "Media uploaded successfully to X"
            }),
            200,
        );

    } catch (error) {
        console.error("Error in X media upload:", error);
        
        if (error instanceof HTTPException) {
            throw error;
        }
        
        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not connected') || error.message.includes('not found')) {
                throw new HTTPException(404, {
                    message: error.message
                });
            }
            
            if (error.message.includes('refresh') || error.message.includes('re-authenticate')) {
                throw new HTTPException(401, {
                    message: error.message
                });
            }
            
            if (error.message.includes('media')) {
                throw new HTTPException(400, {
                    message: error.message
                });
            }
            
            if (error.message.includes('token') || error.message.includes('auth')) {
                throw new HTTPException(401, {
                    message: "Authentication failed. Please reconnect your X account."
                });
            }
        }

        throw new HTTPException(500, {
            message: "Failed to upload media to X"
        });
    }
});

export default xMediaUploadHandler;
