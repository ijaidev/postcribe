import { getUserTweets } from "@repo/x";
import { suggestionGraph } from "../graphs/suggestion-gen";
import { HumanMessage, isAIMessageChunk } from "@langchain/core/messages";
import type { suggestionGraphConfig } from "../graph-states";
import { logger } from "@repo/logger";
import { getRedisClient } from "@repo/redis";

interface SuggestionGenResponse {
    event: string;
    content: string;
}

const redis = getRedisClient();

export const generatePostSuggestions = async (
    userId: string,
    numberOfPrompts: number = 10,
    refresh: boolean = false,
) => {
    try {
        const cachedSuggestions = await redis.get(`suggestion_${userId}`);
        if (cachedSuggestions && !refresh) {
            return JSON.parse(cachedSuggestions);
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
            async *stream(): AsyncGenerator<SuggestionGenResponse> {
                yield {
                    event: "start",
                    content: "",
                };
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
                    if (event === "on_chat_model_end") {
                        const { chunk } = data;
                        if (!isAIMessageChunk(chunk)) continue;
                        const toolCall = chunk.tool_calls?.[0];
                        const isResponse = toolCall?.name === "response";
                        if (isResponse) {
                            const response = toolCall?.args;
                            await redis.set(
                                `suggestion_${userId}`,
                                JSON.stringify(response),
                                "EX",
                                60
                            );
                        }
                    }
                    if (event === "on_chain_end") {
                        yield {
                            event: "end",
                            content: "",
                        };
                    }
                }
            },
        };
    } catch (error) {
        logger.error({ error, userId }, "Failed to generate post suggestions");
        throw error;
    }
};
