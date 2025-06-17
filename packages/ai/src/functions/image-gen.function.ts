import { xImageGraph, linkedInImageGraph } from "../graphs/image-gen";
import {
    HumanMessage,
    isToolMessage,
    RemoveMessage,
    ToolMessage,
} from "@langchain/core/messages";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { graphConfig, imageGraphState } from "../graph-states";
import { logger } from "@repo/logger";

interface ImageGenOptions {
    message: string;
    images?: string[];
    version?: number;
    draftId: string;
}

interface ImageGenResponse {
    imageUrl: string;
}

const imageGen = async (
    options: ImageGenOptions,
    platform: "X" | "LINKEDIN",
): Promise<ImageGenResponse> => {
    const { message, version, draftId, images } = options;

    const config: LangGraphRunnableConfig<graphConfig> = {
        configurable: {
            thread_id: draftId,
            platform,
        },
    };

    const graph = platform === "X" ? xImageGraph : linkedInImageGraph;

    const currentState = await graph.getState(config);
    const values: imageGraphState = currentState.values;

    if (version && version > 0) {
        const { images, messages } = values;
        if (images && images.length - 1 > version) {
            const imageToRemoveIndex = version + 1;
            const imageToRemove = images[imageToRemoveIndex];
            const messageToRemoveId = imageToRemove?.messageId;
            const messageToRemoveIndex = messages.findIndex(
                message => message.id === messageToRemoveId,
            );
            if (messageToRemoveIndex !== -1 || imageToRemoveIndex !== -1) {
                await graph.updateState(config, {
                    messages: messages
                        .slice(messageToRemoveIndex, messages.length)
                        .map(message => new RemoveMessage({ id: message.id! })),
                    images: images.slice(imageToRemoveIndex, images.length),
                });
            }
        }
    }
    const lastImage =
        images && images.length > 0 ? images[images.length - 1] : undefined;

    const inputMessage = [
        new HumanMessage({
            content: [
                {
                    type: "text",
                    text: message,
                },
                ...(lastImage
                    ? [
                          {
                              type: "image_url",
                              image_url: {
                                  url: lastImage,
                              },
                          },
                      ]
                    : []),
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

    const stream = await graph.stream(
        { messages: inputMessage },
        {
            streamMode: "updates",
            ...config,
        },
    );
    for await (const chunk of stream) {
        for (const [node, values] of Object.entries<imageGraphState>(chunk)) {
            if (
                node !== "toolNode" ||
                values.messages.length === 0 ||
                !isToolMessage(values.messages[0]!)
            )
                continue;

            if (!values.images || values.images.length === 0) continue;
            const imageUrl = values.images[values.images.length - 1]?.imageUrl;
            if (!imageUrl) continue;
            return {
                imageUrl,
            };
        }
    }
    throw new Error("No image URL found");
};

export { imageGen };
export type { ImageGenOptions, ImageGenResponse };
