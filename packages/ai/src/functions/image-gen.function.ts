import { xImageGraph, linkedInImageGraph } from "../graphs/image-gen";
import {
    HumanMessage,
    isToolMessage,
    RemoveMessage,
} from "@langchain/core/messages";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { imageGraphConfig, imageGraphState } from "../graph-states";

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

    const config: LangGraphRunnableConfig<imageGraphConfig> = {
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
        values.images && values.images.length > 0
            ? values.images[values.images.length - 1]
            : undefined;

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
            streamMode: "values",
            ...config,
        },
    );

    const currentImagesLength = values.images?.length || 0;

    for await (const values of stream) {
        if (!values.images || values.images.length === 0) continue;
        if (currentImagesLength >= values.images.length) continue;
        const imageUrl = values.images[values.images.length - 1]?.imageUrl;
        if (!imageUrl) continue;
        return {
            imageUrl,
        };
    }
    throw new Error("No image URL found");
};

export { imageGen };
export type { ImageGenOptions, ImageGenResponse };
