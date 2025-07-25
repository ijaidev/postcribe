import { generateNameFromDiscussion } from "../graphs/name-gen";
import { linkedInPostGraph, xPostGraph } from "../graphs/post-gen";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { postGraphConfig, postGraphState } from "../graph-states";
import { HumanMessage } from "@langchain/core/messages";

export async function generateNameWithDraftId(
    draftId: string,
    platform: "X" | "LINKEDIN" | "ALL",
): Promise<string> {
    let finalPlatform: "X" | "LINKEDIN" | undefined;
    if (platform === "X" || platform === "ALL") {
        finalPlatform = "X";
    } else if (platform === "LINKEDIN") {
        finalPlatform = "LINKEDIN";
    }
    if (!finalPlatform) {
        throw new Error("No platform found for draft");
    }

    const graph = finalPlatform === "X" ? xPostGraph : linkedInPostGraph;
    const config: LangGraphRunnableConfig<postGraphConfig> = {
        configurable: {
            thread_id: draftId,
            platform: finalPlatform,
            xAccountId: undefined,
        },
    };
    console.log("config", config);
    const state = await graph.getState(config);
    console.log("state", state);
    const values = state.values as unknown as postGraphState;
    const { messages } = values;
    console.log("messages", messages);
    const messagesAsHumanMessage = new HumanMessage(JSON.stringify(messages));
    const name = await generateNameFromDiscussion([messagesAsHumanMessage]);
    return name;
}
