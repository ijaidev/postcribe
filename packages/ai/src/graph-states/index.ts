import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Post } from "../types";
import { BaseMessage } from "@langchain/core/messages";

const postReducer = (prev: Post[], curr: Post[]) => {
    if (!curr.length) return prev;
    const newPost = curr[0];
    if (!newPost) return prev;

    const lastPost = prev[prev.length - 1];
    const version = lastPost ? lastPost.version + 1 : 0;
    return [...prev, { ...newPost, version }];
};

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

export type postGraphState = typeof postGraphState;
