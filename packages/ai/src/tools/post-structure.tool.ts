import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
import { z } from "zod";
import type { postGraphState } from "../graph-states";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";

const postStructureSchema = z.object({
    post: z
        .string()
        .describe(
            "The social media post content in plain text format, optimized for the target platform",
        ),
    options: z
        .array(z.string())
        .min(3)
        .max(10)
        .describe(
            "Dynamic, contextually relevant suggestions for optimizing or iterating the post. Generate intelligent options based on: 1) Current post analysis (tone, style, content type), 2) Platform-specific optimization opportunities, 3) Engagement enhancement tactics, 4) Viral potential improvements, 5) User's apparent goals/context. Examples of EXCELLENT options: 'Make it more controversial', 'Add trending hashtag', 'Create thread version', 'Add personal story', 'Increase urgency', 'Make it quotable', 'Add call-to-action', 'Optimize for retweets', 'Include industry insight', 'Add contrarian angle'. Avoid generic options like 'Make it better' or 'Edit post'. Each option should be actionable, specific, and immediately useful for improving engagement.",
        ),
});

type PostStructureArgs = z.infer<typeof postStructureSchema>;

const postStructureToolSchema: StructuredToolParams = {
    name: "response",
    description:
        "MANDATORY final tool for delivering optimized social media content and intelligent improvement suggestions to the user. This tool must be called last in every workflow.",
    schema: postStructureSchema,
};

const responseTool = tool(
    async (args: PostStructureArgs, config: ToolRunnableConfig) => {
        const state = getCurrentTaskInput<postGraphState>();

        const messages = state.messages;
        const lastHumanMessage = messages.findLast(message =>
            isHumanMessage(message),
        )!;

        return new Command<postGraphState>({
            update: {
                posts: [
                    {
                        post: args.post,
                        options: args.options,
                        messageId: lastHumanMessage?.id,
                    },
                ],
                messages: [
                    new ToolMessage({
                        content:
                            "High-impact content delivered with strategic optimization options",
                        tool_call_id: config.toolCall?.id as string,
                        name: config.toolCall?.name as string,
                    }),
                ],
            },
        });
    },
    postStructureToolSchema,
);

export default responseTool;
