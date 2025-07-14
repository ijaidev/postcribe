import { xPostGraph, linkedInPostGraph } from "../graphs/post-gen";
import { HumanMessage, isAIMessageChunk } from "@langchain/core/messages";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { postGraphConfig } from "../graph-states";

interface PostGenOptions {
    message: string;
    forceWeb?: boolean;
    draftId: string;
    images?: string[];
    xAccountId?: string;
}

interface PostGenStreamResponse {
    event: "start" | "search" | "extract" | "response" | "end" | "error";
    content: string;
}

const postGen = async (options: PostGenOptions, platform: "X" | "LINKEDIN") => {
    const { message, forceWeb = false, draftId, images, xAccountId } = options;

    // Create thread ID based on apply version or generate new on

    const config: LangGraphRunnableConfig<postGraphConfig> = {
        configurable: {
            thread_id: draftId,
            platform,
            xAccountId,
        },
    };

    const graph = platform === "X" ? xPostGraph : linkedInPostGraph;

    // Enhance message with forceWeb instruction if needed
    let enhancedMessage = message;
    if (forceWeb) {
        enhancedMessage = `${message} \n\nmust use web/internet to generate the post`;
    }

    // Create initial messages - SystemMessage is already in the graph state default
    const inputMessage = [
        new HumanMessage({
            content: [
                {
                    type: "text",
                    text: enhancedMessage,
                },
                ...(images && images.length > 0
                    ? images.map(image => ({
                          type: "image_url",
                          image_url: {
                              url: image,
                          },
                      }))
                    : []),
            ],
        }),
    ];

    // Stream the graph execution
    const stream = graph.streamEvents(
        { messages: inputMessage },
        {
            ...config,
            version: "v2",
        },
    );

    let isResponse = false;
    return {
        async *stream(): AsyncGenerator<PostGenStreamResponse> {
            for await (const chunk of stream) {
                const { data, event } = chunk;
                if (event === "on_chat_model_stream") {
                    const { chunk } = data;
                    if (!isAIMessageChunk(chunk)) continue;

                    const toolCallChunks = chunk.tool_call_chunks;
                    if (!toolCallChunks || toolCallChunks.length === 0) {
                        isResponse = false;
                        continue;
                    }
                    const toolCallChunk =
                        toolCallChunks[toolCallChunks.length - 1];

                    if (toolCallChunk?.name === "response") {
                        isResponse = true;
                    }
                    if (toolCallChunk?.name === "search") {
                        isResponse = false;
                        yield {
                            event: "search",
                            content: "",
                        };
                    }
                    if (toolCallChunk?.name === "extract") {
                        isResponse = false;
                        yield {
                            event: "extract",
                            content: "",
                        };
                    }
                    if (isResponse) {
                        yield {
                            event: "response",
                            content: toolCallChunk?.args || "",
                        };
                    }
                }
            }
        },
    };
};

export { postGen };
export type { PostGenOptions, PostGenStreamResponse };
