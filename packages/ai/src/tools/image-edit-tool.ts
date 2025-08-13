import { AzureOpenAI } from "openai";

import { toFile } from "openai";
import { z } from "zod";
import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";

const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT_IMAGE,
    apiKey: process.env.AZURE_OPENAI_API_KEY_IMAGE,
    apiVersion: "2025-04-01-preview",
    deployment: "gpt-image-1",
});

import { Command, getCurrentTaskInput } from "@langchain/langgraph";

import { type imageGraphState } from "../graph-states";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";
import { uploadImages } from "@repo/s3";
import dotenv from "dotenv";
dotenv.config();

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "Detailed, specific description of the desired modifications to the existing image. Be explicit about what elements to change, add, remove, or transform. Include style adjustments, color changes, object modifications, background alterations, etc. Example: 'Change the business suit to casual clothing, replace office background with a coffee shop setting, make the lighting warmer and more relaxed.'",
        ),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "edit_image",
    description:
        "Intelligently modifies existing images based on detailed instructions. Perfect for refining, adjusting, or transforming previously generated images to better match user vision or platform requirements.",
    schema: paramsSchema,
};

const imageEditTool = tool(
    async (
        { prompt }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<imageGraphState>> => {
        const state: imageGraphState = await getCurrentTaskInput();
        const lastImage = state.images[state.images.length - 1];

        if (!lastImage || lastImage.imageUrl === undefined) {
            throw new Error(
                "Image editing requires an existing image. Please generate an image first, then request modifications.",
            );
        }

        const messages = state.messages;
        const lastHumanMessage = messages.findLast(message =>
            isHumanMessage(message),
        );

        if (!lastHumanMessage) {
            throw new Error("Image editing requires a human message context.");
        }

        const imageUrl = lastImage.imageUrl;

        const imageFile = await toFile(
            await fetch(imageUrl).then(r => r.blob()),
            "image.png",
            { type: "image/png" },
        );

        const result = await openai.images.edit({
            model: "gpt-image-1",
            prompt,
            image: [imageFile],
            n: 1,
            size: "1024x1024",
            quality: "medium",
        });

        const image_base64 = result?.data?.[0]?.b64_json;
        if (!image_base64) {
            throw new Error(
                "Failed to edit image - no data received from OpenAI",
            );
        }

        const urls = await uploadImages([
            {
                base64: image_base64,
                contentType: "image/png",
            },
        ]);

        return new Command<imageGraphState>({
            update: {
                images: [
                    {
                        imageUrl: urls[0],
                        messageId: lastHumanMessage?.id,
                    },
                ],
                messages: [
                    new ToolMessage({
                        content: JSON.stringify({
                            url: urls[0],
                            action: "edited_image",
                        }),
                        tool_call_id: config.toolCall?.id as string,
                    }),
                ],
            },
        });
    },
    toolSchema,
);

export default imageEditTool;
