import { AzureChatOpenAI, ChatOpenAI } from "@langchain/openai";
import {
    END,
    START,
    StateGraph,
    type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import {
    AIMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import suggestionResponseTool from "../tools/suggestion-structure.tool";
import { suggestionGraphState, suggestionGraphConfig } from "../graph-states";
import { getSuggestionPrompt } from "../config/system-prompts";
import { tavilyExtract, tavilySearch } from "../tools/tavily-tools";
import dotenv from "dotenv";
dotenv.config();

// const model = new ChatOpenAI({
//     model: "gpt-4.1-mini",
//     apiKey: process.env.OPENAI_API_KEY,
//     temperature: 0.7,
// });

const model = new AzureChatOpenAI({
    model: "gpt-4.1-mini",
    temperature: 1,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiDeploymentName: "gpt-4.1-mini",
    azureOpenAIApiVersion: "2024-04-01-preview",
});

const tools = [suggestionResponseTool, tavilyExtract, tavilySearch];

const toolNode = new ToolNode<suggestionGraphState>(tools);

const isToolCallNode = (
    state: suggestionGraphState,
): "toolNode" | typeof END => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return "__end__";
    }
    return "toolNode";
};

const isModelCallNode = (
    state: suggestionGraphState,
): "modelCall" | typeof END => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as ToolMessage;
    if (lastMessage.name === "response") {
        return "__end__";
    }
    return "modelCall";
};

const modelWithTools = model.bindTools(tools);

const modelCallNode = async (
    state: suggestionGraphState,
    config: LangGraphRunnableConfig<suggestionGraphConfig>,
): Promise<suggestionGraphState> => {
    const { messages } = state;

    // Only send last 5 messages to LLM as specified
    const recentMessages = messages.slice(-5);

    // Get numberOfPrompts from metadata, default to 10
    const numberOfPrompts = config.configurable?.numberOfPrompts || 50;
    const systemPrompt = getSuggestionPrompt(numberOfPrompts);

    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...recentMessages,
    ]);
    return {
        messages: [response],
    };
};

const suggestionGraph = new StateGraph(
    suggestionGraphState,
    suggestionGraphConfig,
)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addConditionalEdges("toolNode", isModelCallNode)
    .compile();

export { suggestionGraph };
