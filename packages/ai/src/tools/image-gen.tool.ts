import OpenAI from "openai";
import { z } from "zod";
import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../utils/s3-r2-client";
import { Command, END, getCurrentTaskInput } from "@langchain/langgraph";
import type { imageGraphState } from "../graph-states";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";
import { R2_BUCKET_NAME } from "../config/consts";
import { R2_PUBLIC_URL } from "../config/consts";

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "Ultra-detailed, specific description of the image to generate. Include: subject matter, artistic style (photorealistic, illustration, cartoon, etc.), color palette, lighting conditions, composition, mood/atmosphere, background elements, and any specific details. The more descriptive and specific, the better the generated image will match expectations. Example: 'A confident business woman in a navy blue blazer standing in a modern glass office, natural daylight streaming through floor-to-ceiling windows, professional photography style, clean background with city skyline visible, warm lighting, corporate aesthetic.'"
        ),
    platform: z
        .enum(["x", "linkedin", "all"])
        .describe(
            "Target social media platform."
        ),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "generate_image",
    description: "Creates high-impact, platform-optimized images from detailed text prompts. Use when original visual content is needed to enhance social media posts and drive engagement.",
    schema: paramsSchema,
};

const ImageGenTool = tool(
    async (
        { prompt, platform }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<imageGraphState>> => {

        const state: typeof imageGraphState.State = await getCurrentTaskInput();
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
            quality: "hd",
            output_format: "png",
        });
        
        const image_base64 = result?.data?.[0]?.b64_json;
        if (!image_base64) {
            throw new Error("Failed to generate image - no data received from OpenAI");
        }
        
        const key = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
        const image_bytes = Buffer.from(image_base64, "base64");
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: image_bytes,
            ContentType: "image/png",
        });

        await s3.send(command);
        
        return new Command<imageGraphState>({
            update: {
                images: [
                    {
                        imageUrl: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                        messageId: lastHumanMessage?.id
                    },
                ],
                messages: [
                    new ToolMessage({
                        content: JSON.stringify({
                            url: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                            platform,
                            action: "generated_image",
                        }),
                        tool_call_id: config.toolCall?.id as string,
                    }),
                ],
            },
            goto: END
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
