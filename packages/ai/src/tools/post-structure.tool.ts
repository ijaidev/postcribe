import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
import { z } from "zod";
import type { postGraphState } from "../graph-states";
import { Command, END, getCurrentTaskInput } from "@langchain/langgraph";
import { isHumanMessage, ToolMessage } from "@langchain/core/messages";

const postStructureSchema = z.object({
    post: z.string().describe("Social media post"),
    options: z
        .array(z.string())
        .max(10)
        .describe(
            "Distinct, concise, and contextually relevant suggestions for the user to modify or iterate on the generated posts. Examples: 'Make it more formal', 'Make it short', 'Be Sarcastic', 'Make it funny', 'Translate to Spanish' etc. these are just examples, craft relevant options based on context. Each option should be a short phrase suitable for a ui button. Analyze the current posts and conversation to provide helpful and appropriate suggestions. Avoid suggestions that contradict the post's tone or purpose (e.g., 'Make it humorous' for a somber announcement).",
        ),
});

type PostStructureArgs = z.infer<typeof postStructureSchema>;

const postStructureToolSchema: StructuredToolParams = {
    name: "response",
    description: "Must use this tool to respond to the user",
    schema: postStructureSchema,
};

const responseTool = tool(
    async (args: PostStructureArgs, config: ToolRunnableConfig) => {
        const state: typeof postGraphState.State = await getCurrentTaskInput();

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
                        content: "Message delivered to user",
                        tool_call_id: config.toolCall?.id as string,
                    }),
                ],
            },
            goto: END,
        });
    },
    postStructureToolSchema,
);

export default responseTool;
