import { getUserTweets } from "@repo/x";
import { suggestionGraph } from "../graphs/suggestion-gen";
import { HumanMessage, isAIMessageChunk } from "@langchain/core/messages";
import type { suggestionGraphConfig } from "../graph-states";
import { logger } from "@repo/logger";
import { getRedisClient } from "@repo/redis";

interface SuggestionGenStreamResponse {
    event: "start" | "search" | "extract" | "response" | "end" | "error";
    content: string;
}

interface Suggestions {
    suggestions: string[];
}

const redis = getRedisClient();

export const generatePostSuggestions = async (
    userId: string,
    numberOfPrompts: number = 10,
    refresh: boolean = false,
): Promise<{
    stream: () => AsyncGenerator<SuggestionGenStreamResponse, any, any>;
}> => {
    try {
        const cachedSuggestions = await redis.get(`suggestion_${userId}`);
        if (cachedSuggestions && !refresh) {
            const suggestions: Suggestions = JSON.parse(cachedSuggestions);
            return {
                async *stream(): AsyncGenerator<SuggestionGenStreamResponse> {
                    yield {
                        event: "start",
                        content: "",
                    };
                    yield {
                        event: "response",
                        content: "{\n\"suggestions\": [",
                    };
                    for (const suggestion of suggestions.suggestions) {
                        yield {
                            event: "response",
                            content: `"${suggestion}"`,
                        }
                    }
                    yield {
                        event: "response",
                        content: "],\n}",
                    };
                    yield {
                        event: "end",
                        content: "",
                    };
                },
            };
        }

        // Get user's recent tweets
        const tweets = await getUserTweets(userId);

        if (!tweets || tweets.length === 0) {
            throw new Error("No tweets found for the provided user ID");
        }

        // Format tweets for analysis
        const tweetsText = tweets
            .map(
                (tweet, index) =>
                    `Tweet ${index + 1} (${tweet.created_at}):
                    Text: ${tweet.text}
                    Engagement: \n${tweet.metrics.likes} likes, \n${tweet.metrics.retweets} retweets, \n${tweet.metrics.replies} replies
                    -------------`,
            )
            .join("\n");

        const userMessage = new HumanMessage(
            `Analyze these recent tweets from the user and generate ${numberOfPrompts} personalized PROMPT SUGGESTIONS that can be fed to an AI post generation agent:

            ${tweetsText}

            Please analyze their content patterns, style, topics, and engagement data to create tailored prompt suggestions that would help them generate posts that perform well based on their audience and previous success patterns. Each prompt should be a clear instruction that can be directly fed to an AI post generator.`,
        );

        const config: suggestionGraphConfig = {
            numberOfPrompts: numberOfPrompts,
        };

        const stream = suggestionGraph.streamEvents(
            { messages: [userMessage] },
            {
                configurable: config,
                version: "v2",
            },
        );

        let isResponse = false;

        return {
            async *stream(): AsyncGenerator<SuggestionGenStreamResponse> {
                yield {
                    event: "start",
                    content: "",
                };

                try {
                    for await (const chunk of stream) {
                        const { data, event } = chunk;
                        if (event === "on_chat_model_stream") {
                            if (!data?.chunk) continue;
                            const { chunk: messageChunk } = data;
                            if (!messageChunk) continue;
                            if (!isAIMessageChunk(messageChunk)) continue;

                            const toolCallChunks =
                                messageChunk.tool_call_chunks;
                            if (
                                !toolCallChunks ||
                                toolCallChunks.length === 0
                            ) {
                                isResponse = false;
                                continue;
                            }

                            const toolCallChunk =
                                toolCallChunks[toolCallChunks.length - 1];
                            if (!toolCallChunk) continue;

                            if (toolCallChunk.name === "response") {
                                isResponse = true;
                            }
                            if (toolCallChunk.name === "search") {
                                isResponse = false;
                                yield {
                                    event: "search",
                                    content: "",
                                };
                            }
                            if (toolCallChunk.name === "extract") {
                                isResponse = false;
                                yield {
                                    event: "extract",
                                    content: "",
                                };
                            }
                            if (isResponse && toolCallChunk.args) {
                                yield {
                                    event: "response",
                                    content: toolCallChunk.args,
                                };
                            }
                        }

                        if (event === "on_chat_model_end") {
                            const aiMessage = data?.output;
                            if (!isAIMessageChunk(aiMessage)) continue;

                            const toolCalls = aiMessage.tool_calls;
                            if (!toolCalls || toolCalls.length === 0) continue;

                            const toolCall = toolCalls[toolCalls.length - 1];
                            if (!toolCall) continue;

                            if (toolCall.name === "response") {
                                const toolCallArgs = toolCall?.args;
                                if (!toolCallArgs) continue;
                                redis.set(
                                    `suggestion_${userId}`,
                                    JSON.stringify(toolCallArgs),
                                    "EX",
                                    60,
                                );
                            }
                        }
                    }
                } catch (streamError) {
                    logger.error(
                        { streamError },
                        "Error in suggestion stream processing",
                    );
                    yield {
                        event: "error",
                        content: "Stream processing error",
                    };
                }

                yield {
                    event: "end",
                    content: "",
                };
            },
        };
    } catch (error) {
        logger.error({ error, userId }, "Failed to generate post suggestions");
        throw error;
    }
};

export type { SuggestionGenStreamResponse, Suggestions };