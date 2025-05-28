import type { imageGraphState, postGraphState } from "../graph-states";
import { linkedInImageGraph, xImageGraph } from "../graphs/image-gen";
import { linkedInPostGraph } from "../graphs/post-gen";

import { xPostGraph } from "../graphs/post-gen";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

interface GetPostsOptions {
    draftId: string;
}

interface Post {
    content: string;
    version: number;
}

interface Image {
    url: string;
    version: number;
}

interface GetPostsResponse {
    x: {
        posts: Post[];
        images: Image[];
    };
    linkedin: {
        posts: Post[];
        images: Image[];
    };
}

const getPosts = async (options: GetPostsOptions): Promise<GetPostsResponse> => {
    const { draftId } = options;
    const config: LangGraphRunnableConfig = {
        configurable: {
            thread_id: draftId,
        }
    }
    const xState = await xPostGraph.getState(config);
    const xValues: postGraphState = xState.values;
    const linkedinState = await linkedInPostGraph.getState(config);
    const linkedinValues: postGraphState = linkedinState.values;

    const xImageState = await xImageGraph.getState(config);
    const xImageValues: imageGraphState = xImageState.values;
    const linkedinImageState = await linkedInImageGraph.getState(config);
    const linkedinImageValues: imageGraphState = linkedinImageState.values;

    const xPosts = xValues.posts?.map((post) => ({
        content: post.post,
        version: post.version,
    }));
    const xImages = xImageValues.images?.map((image) => ({
        url: image.imageUrl,
        version: image.version,
    }));

    const linkedinImages = linkedinImageValues.images?.map((image) => ({
        url: image.imageUrl,
        version: image.version,
    }));

    const linkedinPosts = linkedinValues.posts?.map((post) => ({
        content: post.post,
        version: post.version,
    }));
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