import type {
    imageGraphConfig,
    imageGraphState,
    postGraphConfig,
    postGraphState,
} from "../graph-states";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { linkedInPostGraph, xPostGraph } from "../graphs/post-gen";
import { linkedInImageGraph, xImageGraph } from "../graphs/image-gen";
import { RemoveMessage } from "@langchain/core/messages";

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

    const currentState = await graph.getState(config);
    const values: postGraphState = currentState.values;
    const { posts, messages } = values;

    if (posts.length <= applyVersion + 1) return;
    const post = posts[applyVersion];
    const messageId = post?.messageId;

    if (!messageId) return;

    const postToRemoveFrom = posts[applyVersion + 1];
    const messageIndex = messages.findIndex(
        m => m.id === postToRemoveFrom?.messageId,
    );

    if (messageIndex === -1) return;

    const messagesToRemove = messages.slice(messageIndex);

    await graph.updateState(config, {
        messages: messagesToRemove.map(
            m => new RemoveMessage({ id: m.id || "" }),
        ),
    });

    await graph.updateState(config, {
        posts: [{ __apply_version: applyVersion }],
    });
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

    const currentState = await graph.getState(config);
    const values: imageGraphState = currentState.values;
    const { images, messages } = values;

    if (images.length <= applyVersion + 1) return;
    const image = images[applyVersion];
    const messageId = image?.messageId;

    if (!messageId) return;

    const imageToRemoveFrom = images[applyVersion + 1];
    const messageIndex = messages.findIndex(
        m => m.id === imageToRemoveFrom?.messageId,
    );
    if (messageIndex === -1) return;
    const messagesToRemove = messages.slice(messageIndex);

    await graph.updateState(config, {
        messages: messagesToRemove.map(
            m =>
                new RemoveMessage({
                    id: m.id || "",
                }),
        ),
    });

    await graph.updateState(config, {
        images: [{ __apply_version: applyVersion }],
    });
};

export { applyVersionPost, applyVersionImage };
