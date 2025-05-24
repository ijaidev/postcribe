import type { postGraphState } from "../graph-states";
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

interface GetPostsResponse {
    x: Post[];
    linkedin: Post[];
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
    const xPosts = xValues.posts?.map((post) => ({
        content: post.post,
        version: post.version,
    }));
    const linkedinPosts = linkedinValues.posts?.map((post) => ({
        content: post.post,
        version: post.version,
    }));
    return {
        x: xPosts ?? [],
        linkedin: linkedinPosts ?? [],
    };
};

export { getPosts };