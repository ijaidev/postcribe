import { AzureOpenAI } from "openai";
import { z } from "zod";
import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";

// const openai = new OpenAI({
//     apiKey: process.env.OPENAI_API_KEY,
// });

const openai = new AzureOpenAI({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT_IMAGE,
    apiKey: process.env.AZURE_OPENAI_API_KEY_IMAGE,
    apiVersion: "2025-04-01-preview",
    deployment: "gpt-image-1",
});

import { uploadImages } from "@repo/s3";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import type { imageGraphState } from "../graph-states";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
dotenv.config();

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "Ultra-detailed, specific description of the image to generate. Include: subject matter, artistic style (photorealistic, illustration, cartoon, etc.), color palette, lighting conditions, composition, mood/atmosphere, background elements, and any specific details. The more descriptive and specific, the better the generated image will match expectations. Example: 'A confident business woman in a navy blue blazer standing in a modern glass office, natural daylight streaming through floor-to-ceiling windows, professional photography style, clean background with city skyline visible, warm lighting, corporate aesthetic.'",
        ),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "generate_image",
    description:
        "Creates high-impact, platform-optimized images from detailed text prompts. Use when original visual content is needed to enhance social media posts and drive engagement.",
    schema: paramsSchema,
};

const ImageGenTool = tool(
    async (
        { prompt }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<imageGraphState>> => {
        const state: imageGraphState = await getCurrentTaskInput();
        const messages = state.messages;
        const lastHumanMessage = messages.findLast(message =>
            isHumanMessage(message),
        )!;

        if (!lastHumanMessage) {
            throw new Error(
                "Image generation requires a human message context.",
            );
        }

        const result = await openai.images.generate({
            model: "gpt-image-1",
            prompt,
            n: 1,
            size: "1024x1024",
            quality: "medium",
            output_format: "png",
        });

        const image_base64 = result?.data?.[0]?.b64_json;
        if (!image_base64) {
            throw new Error(
                "Failed to generate image - no data received from OpenAI",
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
                            action: "generated_image",
                        }),
                        tool_call_id: config.toolCall?.id as string,
                    }),
                ],
            },
        });
    },
    toolSchema,
);

export default ImageGenTool;

// const result = await ImageGenTool.invoke({
//     prompt: "A children's book drawing of a veterinarian using a stethoscope to listen to the heartbeat of a baby otter.",
//     platform: "x",
// });

// console.log(result);
