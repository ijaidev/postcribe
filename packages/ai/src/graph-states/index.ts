import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Post } from "../types";
import { BaseMessage } from "@langchain/core/messages";
export const postGraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
    posts: Annotation<Post[]>
});