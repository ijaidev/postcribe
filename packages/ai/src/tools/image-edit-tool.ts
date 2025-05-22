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
            "A detailed textual description of the desired modifications to the image. Be specific about the changes. For example: 'Make the cat wear a party hat', 'Change the background to a sunny beach with palm trees', 'Remove the person on the right'.",
        ),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "edit_image",
    description: JSON.stringify({
        zIndex: 2,
        description:
            "Modifies an existing image based on a detailed textual prompt. You must provide the URL of the image to be edited and clear instructions for the desired changes. Use this tool to alter specific elements, styles, or content within an image, such as adding objects, changing colors, or modifying backgrounds.",
    }),
    schema: paramsSchema,
};

const imageEditTool = tool(
    async (
        { prompt }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<imageGraphState>> => {
        const state: typeof imageGraphState.State = await getCurrentTaskInput();
        const lastImage = state.images[state.images.length - 1];
        if (!lastImage || lastImage.imageUrl === undefined)
            throw new Error(
                "This tool requires an existing image to edit. Ensure 'response' tool (zIndex 1) runs first to create a post, then call this tool (zIndex 2).",
            );

        const messages = state.messages;
        const lastHumanMessage = messages.findLast(message =>
            isHumanMessage(message),
        );

        if (!lastHumanMessage) {
            throw new Error(
                "This tool required a human message.",
            );
        }

        const imageUrl = lastImage.imageUrl;

        const imageFile = await toFile(
            await fetch(imageUrl).then(r => r.blob()),
            "image.png",
            { type: "image/png" },
        );

        const result = await openai.images.edit({
            model: "gpt-image-1", // Consider making model configurable or using a newer one if available
            prompt,
            image: [imageFile], // OpenAI API expects an array for `image` in some SDK versions, ensure this matches current API
            n: 1,
            size: "1024x1024",
            quality: "low", // "standard" or "hd" are typical values, "medium" might not be standard. Check OpenAI docs.
        });
        const image_base64 = result?.data?.[0]?.b64_json;
        if (!image_base64) {
            throw new Error("No image data found from OpenAI API response");
        }
        const key = `${Math.random().toString(36).substring(2, 15)}.png`;
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
                            action: "edited_image",
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
