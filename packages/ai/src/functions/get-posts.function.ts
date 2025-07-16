import type { imageGraphState, postGraphState } from "../graph-states";
import { linkedInImageGraph, xImageGraph } from "../graphs/image-gen";
import { linkedInPostGraph } from "../graphs/post-gen";

import { xPostGraph } from "../graphs/post-gen";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { Post, Image } from "../types";

interface GetPostsOptions {
    draftId: string;
}
type PostResponse = Omit<Post, "__apply_version" | "messageId">;
type ImageResponse = Omit<Image, "__apply_version" | "messageId">;

interface GetPostsResponse {
    x: {
        posts: PostResponse[];
        images: ImageResponse[];
    };
    linkedin: {
        posts: PostResponse[];
        images: ImageResponse[];
    };
}

const getPosts = async (
    options: GetPostsOptions,
): Promise<GetPostsResponse> => {
    const { draftId } = options;
    const config: LangGraphRunnableConfig = {
        configurable: {
            thread_id: draftId,
        },
    };
    const xState = await xPostGraph.getState(config);
    const xValues: postGraphState = xState.values;
    const linkedinState = await linkedInPostGraph.getState(config);
    const linkedinValues: postGraphState = linkedinState.values;

    const xImageState = await xImageGraph.getState(config);
    const xImageValues: imageGraphState = xImageState.values;
    const linkedinImageState = await linkedInImageGraph.getState(config);
    const linkedinImageValues: imageGraphState = linkedinImageState.values;

    const xPosts = xValues.posts;
    const xImages = xImageValues.images;

    const linkedinImages = linkedinImageValues.images;

    const linkedinPosts = linkedinValues.posts;

    return {
        x: {
            posts: xPosts ?? [],
            images: xImages ?? [],
        },
        linkedin: {
            posts: linkedinPosts ?? [],
            images: linkedinImages ?? [],
        },
    };
};

export { getPosts, type GetPostsResponse };
