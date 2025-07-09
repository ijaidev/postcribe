import { logger } from "@repo/logger";
import { imageGen, type ImageGenOptions, type ImageGenResponse } from "./image-gen.function";
import {
    postGen,
    type PostGenOptions,
    type PostGenStreamResponse,
} from "./post-gen.function";

export interface CronPostGenOptions {
    draftId: string;
    message: string; // user requirement
    platform: "X" | "LINKEDIN" | "ALL";
    inputImages?: string[]; // URLs or base64
    generateImage?: boolean; // defaults to true if not provided
    imagePrompt?: string;
    forceWeb?: boolean;
}

export interface CronPostGenResponse {
    success: true;
}

export const cronPostGen = async (
    options: CronPostGenOptions,
): Promise<CronPostGenResponse> => {
    const {
        draftId,
        message,
        platform,
        inputImages = [],
        generateImage = true,
        imagePrompt = "Brain storm and generate a image for the this post.",
        forceWeb,
    } = options;

    try {
        // First generate posts
        const postGenPromises: Promise<{
            stream(): AsyncGenerator<PostGenStreamResponse>;
        }>[] = [];

        if (platform === "X" || platform === "ALL") {
            const xPostGenOptions: PostGenOptions = {
                draftId,
                message,
                images: inputImages.length > 0 ? inputImages : undefined,
                forceWeb,
            };
            postGenPromises.push(postGen(xPostGenOptions, "X"));
        }

        if (platform === "LINKEDIN" || platform === "ALL") {
            const linkedinPostGenOptions: PostGenOptions = {
                draftId,
                message,
                images: inputImages.length > 0 ? inputImages : undefined,
                forceWeb,
            };
            postGenPromises.push(postGen(linkedinPostGenOptions, "LINKEDIN"));
        }

        await Promise.all(postGenPromises);

        // Then generate images if needed
        if (generateImage) {
            const imageGenPromises: Promise<ImageGenResponse>[] = [];

            const commonImageGenOpts: ImageGenOptions = {
                draftId,
                message: imagePrompt,
                images: inputImages.length > 0 ? inputImages : undefined,
            };

            if (platform === "X" || platform === "ALL") {
                imageGenPromises.push(imageGen(commonImageGenOpts, "X"));
            }
            if (platform === "LINKEDIN" || platform === "ALL") {
                imageGenPromises.push(imageGen(commonImageGenOpts, "LINKEDIN"));
            }
            await Promise.all(imageGenPromises);
        }
        return { success: true };
    } catch (error) {
        logger.error({ error }, "Failed to generate cron post");
        throw error;
    }
};
