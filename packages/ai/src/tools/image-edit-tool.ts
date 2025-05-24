import OpenAI, { toFile } from "openai";
import { z } from "zod";
import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

import { Command, END, getCurrentTaskInput } from "@langchain/langgraph";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../utils/s3-r2-client";
import { type imageGraphState } from "../graph-states";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";
import { R2_BUCKET_NAME } from "../config/consts";
import { R2_PUBLIC_URL } from "../config/consts";

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "Detailed, specific description of the desired modifications to the existing image. Be explicit about what elements to change, add, remove, or transform. Include style adjustments, color changes, object modifications, background alterations, etc. Example: 'Change the business suit to casual clothing, replace office background with a coffee shop setting, make the lighting warmer and more relaxed.'"
        ),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "edit_image",
    description: "Intelligently modifies existing images based on detailed instructions. Perfect for refining, adjusting, or transforming previously generated images to better match user vision or platform requirements.",
    schema: paramsSchema,
};

const imageEditTool = tool(
    async (
        { prompt }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<imageGraphState>> => {
        const state: typeof imageGraphState.State = await getCurrentTaskInput();
        const lastImage = state.images[state.images.length - 1];
        
        if (!lastImage || lastImage.imageUrl === undefined) {
            throw new Error(
                "Image editing requires an existing image. Please generate an image first, then request modifications."
            );
        }

        const messages = state.messages;
        const lastHumanMessage = messages.findLast(message =>
            isHumanMessage(message),
        );

        if (!lastHumanMessage) {
            throw new Error(
                "Image editing requires a human message context."
            );
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
                quality: "standard",
            });
            
            const image_base64 = result?.data?.[0]?.b64_json;
            if (!image_base64) {
                throw new Error("Failed to edit image - no data received from OpenAI");
            }
            
            const key = `edited-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.png`;
            const image_bytes = Buffer.from(image_base64, "base64");
            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
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
                            messageId: lastHumanMessage?.id,
                        },
                    ],
                    messages: [
                        new ToolMessage({
                            content: JSON.stringify({
                                url: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                                action: "edited_image"
                            }),
                            tool_call_id: config.toolCall?.id as string,
                        }),
                    ],
                },
                goto: END,
            });
    },
    toolSchema,
);

export default imageEditTool;

// const result = await imageEditTool.invoke({
//     prompt: "change the otter to a dog",
//     image_url: "https://pub-a9d1d733450b4c238f0f8fcd82d6d699.r2.dev/postcribe/0os53hqzpcf.png",
//     platform: "x",
// });

// console.log(result);
