import type {
    imageGraphConfig,
    imageGraphState,
    postGraphConfig,
    postGraphState,
} from "../graph-states";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { RemoveMessage } from "@langchain/core/messages";
import { linkedInPostGraph, xPostGraph } from "../graphs/post-gen";
import { linkedInImageGraph, xImageGraph } from "../graphs/image-gen";

export interface ApplyOptions {
    applyVersion: number;
    draftId: string;
    platform: "X" | "LINKEDIN";
}

const applyVersionPost = async (options: ApplyOptions) => {
    const { applyVersion, draftId, platform } = options;

    const graph = platform === "X" ? xPostGraph : linkedInPostGraph;

    const config: LangGraphRunnableConfig<postGraphConfig> = {
        configurable: {
            thread_id: draftId,
            platform: platform as "X" | "LINKEDIN",
            xAccountId: undefined,
        },
    };
    console.log("posts before", (await graph.getState(config)).values.posts);
    if (applyVersion && applyVersion > 0) {
        if (applyVersion && applyVersion > 0) {
            const currentState = await graph.getState(config);
            const values: postGraphState = currentState.values;
            const { posts, messages } = values;
            if (posts.length - 1 > applyVersion) {
                const postToRemoveIndex = applyVersion + 1;
                const postToRemove = posts[postToRemoveIndex];
                const messageToRemoveId = postToRemove?.messageId;
                const messageToRemoveIndex = messages.findIndex(
                    message => message.id === messageToRemoveId,
                );
                if (messageToRemoveIndex !== -1 || postToRemoveIndex !== -1) {
                    graph.updateState(config, {
                        messages: messages
                            .slice(messageToRemoveIndex, messages.length)
                            .map(
                                message =>
                                    new RemoveMessage({ id: message.id! }),
                            ),
                        posts: posts.slice(postToRemoveIndex, posts.length),
                    });
                }
            }
        }
    }

    console.log("posts after", (await graph.getState(config)).values.posts);
};

const applyVersionImage = async (options: ApplyOptions) => {
    const { applyVersion, draftId, platform } = options;

    const graph = platform === "X" ? xImageGraph : linkedInImageGraph;

    const config: LangGraphRunnableConfig<imageGraphConfig> = {
        configurable: {
            thread_id: draftId,
            platform: platform as "X" | "LINKEDIN",
        },
    };

    if (applyVersion && applyVersion > 0) {
        const currentState = await graph.getState(config);
        const values: imageGraphState = currentState.values;
        const { images, messages } = values;
        if (images && images.length - 1 > applyVersion) {
            const imageToRemoveIndex = applyVersion + 1;
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
};

export { applyVersionPost, applyVersionImage };
