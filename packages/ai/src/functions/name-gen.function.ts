import { generateNameFromDiscussion } from "../graphs/name-gen";
import { linkedInPostGraph, xPostGraph } from "../graphs/post-gen";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { postGraphConfig, postGraphState } from "../graph-states";
import { HumanMessage } from "@langchain/core/messages";

export async function generateNameWithDraftId(
    draftId: string,
    platform: "x" | "linkedin",
): Promise<string> {
    const graph = platform === "x" ? xPostGraph : linkedInPostGraph;
    const config: LangGraphRunnableConfig<postGraphConfig> = {
        configurable: {
            thread_id: draftId,
            platform: platform as "X" | "LINKEDIN",
            xAccountId: undefined,
        },
    };
    const state = await graph.getState(config);
    const values: postGraphState = state.values;
    const { messages } = values;
    const messagesAsHumanMessage = new HumanMessage(messages.toString());
    const name = await generateNameFromDiscussion([messagesAsHumanMessage]);
    return name;
}
