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

import { Command, getCurrentTaskInput } from "@langchain/langgraph";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../utils/s3-r2-client";
import { postGraphState } from "../graph-states";
import { ToolMessage } from "@langchain/core/messages";
import { R2_BUCKET_NAME } from "../config/consts";
import { R2_PUBLIC_URL } from "../config/consts";

const paramsSchema = z.object({
    prompt: z
        .string()
        .describe(
            "A detailed prompt or description of what you want to change/edit in the image.",
        ),
    image_url: z.string().describe("The url of the image to edit."),
    platform: z.enum(["x", "linkedin", "all"]),
});

type Params = z.infer<typeof paramsSchema>;

const toolSchema: StructuredToolParams = {
    name: "edit_image",
    description: "Edit an image based on a prompt",
    schema: paramsSchema,
};

const imageEditTool = tool(
    async (
        { prompt, image_url, platform }: Params,
        config: ToolRunnableConfig,
    ): Promise<Command<typeof postGraphState.State>> => {
        const imageFile = await toFile(
            await fetch(image_url).then(r => r.blob()),
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
            throw new Error("No image data found");
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

        const state: typeof postGraphState.State = await getCurrentTaskInput();
        const lastVersion = state.posts[state.posts.length - 1];

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
                            url: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
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

export default imageEditTool;

// const result = await imageEditTool.invoke({
//     prompt: "change the otter to a dog",
//     image_url: "https://pub-a9d1d733450b4c238f0f8fcd82d6d699.r2.dev/postcribe/0os53hqzpcf.png",
//     platform: "x",
// });

// console.log(result);
