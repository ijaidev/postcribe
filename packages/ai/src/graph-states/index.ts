import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Post, Image } from "../types";
import { BaseMessage } from "@langchain/core/messages";

const postReducer = (prev: Post[], curr: Post[]) => {
    if (!curr.length) return prev;
    const newPost = curr[0];
    if (!newPost) return prev;

    // Special handling for apply operation - replace entire array
    if (typeof newPost.__apply_version === "number") {
        const applyVersion = newPost.__apply_version;
        // Keep only posts with versions <= __apply_version
        const postsToKeep = prev.slice(0, applyVersion + 1);
        return postsToKeep;
    }

    // Normal append operation
    const lastPost = prev[prev.length - 1];
    const version = lastPost ? lastPost.version + 1 : 0;
    return [...prev, { ...newPost, version }];
};

const imageReducer = (prev: Image[], curr: Image[]) => {
    if (!curr.length) return prev;
    const newImage = curr[0];
    if (!newImage) return prev;

    // Special handling for apply operation - replace entire array
    if (typeof newImage.__apply_version === "number") {
        const applyVersion = newImage.__apply_version;
        // Keep only images with versions <= __apply_version
        const imagesToKeep = prev.slice(0, applyVersion + 1);
        return imagesToKeep;
    }

    // Normal append operation
    const lastImage = prev[prev.length - 1];
    const version = lastImage ? lastImage.version + 1 : 0;
    return [...prev, { ...newImage, version }];
};

export const postGraphConfig = Annotation.Root({
    thread_id: Annotation<string>,
    platform: Annotation<"X" | "LINKEDIN">,
    xAccountId: Annotation<string | null | undefined>,
});
export const imageGraphConfig = Annotation.Root({
    thread_id: Annotation<string>,
    platform: Annotation<"X" | "LINKEDIN">,
});

export const postGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    posts: Annotation<Post[]>({
        reducer: postReducer,
        default: () => [],
    }),
});

export const imageGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    images: Annotation<Image[]>({
        reducer: imageReducer,
        default: () => [],
    }),
});

export const suggestionGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
});

export const suggestionGraphConfig = Annotation.Root({
    numberOfPrompts: Annotation<number>,
});

export type suggestionGraphState = typeof suggestionGraphState.State;
export type suggestionGraphConfig = typeof suggestionGraphConfig.State;
export type imageGraphConfig = typeof imageGraphConfig.State;
export type postGraphConfig = typeof postGraphConfig.State;
export type postGraphState = typeof postGraphState.State;
export type imageGraphState = typeof imageGraphState.State;
