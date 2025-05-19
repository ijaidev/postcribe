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
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import type { postGraphState } from "../graph-states";
import { ToolMessage } from "@langchain/core/messages";
import { R2_BUCKET_NAME } from "../config/consts";
import { R2_PUBLIC_URL } from "../config/consts";

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "A detailed prompt or description of the image you want to generate. inlcude everything you can think of to make the image as accurate as possible.",
        ),
    platform: z.enum(["x", "linkedin", "all"]),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "generate_image",
    description: "Generate an image based on a prompt",
    schema: paramsSchema,
};

const ImageGenTool = tool(
    async (
        { prompt, platform }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<typeof postGraphState.State>> => {
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
            throw new Error("No image data found");
        }
        const key = `${Math.random().toString(36).substring(2, 15)}.png`;
        const image_bytes = Buffer.from(image_base64, "base64");
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: image_bytes,
            ContentType: "image/png",
        });

        const state: typeof postGraphState.State = await getCurrentTaskInput();
        const lastVersion = state.posts[state.posts.length - 1];

        await s3.send(command);
        return new Command<typeof postGraphState.State>({
            update: {
                posts: [
                    ...state.posts,
                    {
                        ...lastVersion,
                        images:
                            platform === "all"
                                ? {
                                      x: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                                      linkedin: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                                  }
                                : {
                                      ...lastVersion?.images,
                                      [platform]: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                                  },
                        version: (lastVersion?.version ?? 0) + 1,
                    },
                ],
                messages: [
                    new ToolMessage({
                        content: JSON.stringify({
                            url: `${process.env.R2_PUBLIC_URL}/${process.env.R2_BUCKET_NAME}/${key}`,
                            platform,
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
