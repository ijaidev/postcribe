import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Post, Image } from "../types";
import { BaseMessage, SystemMessage } from "@langchain/core/messages";
import { getPostPrompt } from "../config/system-prompts";

const postReducer = (prev: Post[], curr: Post[]) => {
    if (!curr.length) return prev;
    const newPost = curr[0];
    if (!newPost) return prev;

    const lastPost = prev[prev.length - 1];
    const version = lastPost ? lastPost.version + 1 : 0;
    return [...prev, { ...newPost, version }];
};

const imageReducer = (prev: Image[], curr: Image[]) => {
    if (!curr.length) return prev;
    const newImage = curr[0];
    if (!newImage) return prev;

    const lastImage = prev[prev.length - 1];
    const version = lastImage ? lastImage.version + 1 : 0;
    return [...prev, { ...newImage, version }];
};

export const graphConfig = Annotation.Root({
    thread_id: Annotation<string>,
    platform: Annotation<"x" | "linkedin">,
})

export const xPostGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [new SystemMessage(getPostPrompt("x"))],
    }),
    posts: Annotation<Post[]>({
        reducer: postReducer,
        default: () => [],
    }),
});

export const linkedInPostGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [new SystemMessage(getPostPrompt("linkedin"))],
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

export type graphConfig = typeof graphConfig.State;
export type postGraphState = typeof xPostGraphState.State;
export type imageGraphState = typeof imageGraphState.State;