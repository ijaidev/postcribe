import { tool, type ToolRunnableConfig } from "@langchain/core/tools";
import { z } from "zod";
import type { postGraphState } from "../graph-states";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { ToolMessage } from "@langchain/core/messages";

const postStructureSchema = z.object({
    posts: z
        .object({
            x: z.string().optional().describe("The post to be posted on x"),
            linkedin: z
                .string()
                .optional()
                .describe("The post to be posted on linkedin"),
        })
        .describe("The posts to be posted on x and linkedin"),
    options: z
        .array(z.string())
        .max(5)
        .describe(
            'The options to be available for the user to modify this post like "Make it Concise", "Make it Funny", "Make it Serious", "Make it Short", "Make it Long", "Make it Sarcastic", "Shitty post for X" or any other option related to the post and the topic or platform can be added here. Analyse the sitution and give options accrodingly for example if the post is serious and sad then "Make it Funny" or "Shitty post for X" is not a good option. So feel free to add any option you think is relevant. Options should be not too long for a frontend button. For example "Make it Concise" is good but "Make the post concise and to the point" is not good.',
        ),
});

type PostStructureArgs = z.infer<typeof postStructureSchema>;

const postStructureTool = tool(
    async (args: PostStructureArgs, config: ToolRunnableConfig) => {
        const state: typeof postGraphState.State = await getCurrentTaskInput();
        const lastVersion = state.posts[state.posts.length - 1];

        return new Command<typeof postGraphState.State>({
            update: {
                posts: [
                    ...state.posts,
                    {
                        ...lastVersion,
                        posts: args.posts,
                        options: args.options,
                        version: (lastVersion?.version ?? 0) + 1,
                    },
                ],
                messages: [
                    new ToolMessage({
                        content: "Message delivered to user",
                        tool_call_id: config.toolCall?.id as string,
                    }),
                ],
            },
            goto: "__end__",
        });
    },
    {
        name: "postStructure",
        description:
            "Always respond to the user using this tool. Call this tool at the end of your response with correct args. user will get a reponse automatically no need to do anything else after calling this tool",
        schema: postStructureSchema,
    },
);

export default postStructureTool;
