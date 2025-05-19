import { ChatOpenAI } from "@langchain/openai";
import { TavilyExtract, TavilySearch } from "@langchain/tavily";
import {
    END,
    MemorySaver,
    START,
    StateGraph,
    type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { postGraphState } from "../graph-states/index.js";
import ImageGenTool from "../tools/image-gen.tool";
import imageEditTool from "../tools/image-edit-tool";
import postStructureTool from "../tools/post-structure.tool";
import { postCreationPrompt } from "../config/system-prompts.js";

const model = new ChatOpenAI({
    model: "gpt-4o",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 1,
});

const checkPointer = new MemorySaver();

const tavilySearch = new TavilySearch({
    tavilyApiKey: process.env.TAVILY_API_KEY,
    description: JSON.stringify({
        zIndex: 0,
        description:
            "A search engine optimized for comprehensive, accurate, and trusted results. Useful for when you need to answer questions about current events. Input should be a search query.",
        tip: "Use short keyword or querie instead of big queries/topic. This tool can handle only one query at a time. So if you need more information about a topic, you can use this tool multiple times with different queries.",
    }),
});

const tavilyExtract = new TavilyExtract({
    tavilyApiKey: process.env.TAVILY_API_KEY,
    description: JSON.stringify({
        zIndex: 0,
        description:
            "Extracts comprehensive content from web pages based on provided URLs. Useful for when you need to answer questions about current events. Input should be a list of one or more URLs.",
    }),
});

const tools = [
    tavilySearch,
    tavilyExtract,
    ImageGenTool,
    imageEditTool,
    postStructureTool,
];

const toolNode = new ToolNode<typeof postGraphState.State>(tools);

const isToolCallNode = (
    state: typeof postGraphState.State,
): "toolNode" | typeof END => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return "__end__";
    }
    return "toolNode";
};

const modelWithTools = model.bindTools(tools);

const modelCallNode = async (
    state: typeof postGraphState.State,
): Promise<typeof postGraphState.State> => {
    const { messages } = state;
    const response = await modelWithTools.invoke(messages);
    return {
        messages: [response],
        posts: [],
    };
};

const postWorkflow = new StateGraph(postGraphState)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addEdge("toolNode", "modelCall")
    .compile({ checkpointer: checkPointer });

// const response = postWorkflow.streamEvents(
//     { messages: messages },
//     { version: "v2", maxConcurrency: 5 },
// );

// let currentToolCall: string = "";
// for await (const { event, data } of response) {
//     if (event === "on_chat_model_stream") {
//         const { chunk } = data;
//         if (!isAIMessageChunk(chunk)) continue;

//         const toolCall = chunk.tool_call_chunks?.[0];
//         if (!toolCall) continue;
//         if (toolCall.name) {
//             currentToolCall = toolCall.name;
//         }
//         if (currentToolCall !== "response") continue;
//         process.stdout.write(toolCall.args || "");
//     }
// }

const config: LangGraphRunnableConfig = {
    configurable: {
        thread_id: "1",
    },
};

const humanMessage = new HumanMessage(
    JSON.stringify({
        platform: "x",
        mode: "generate",
        image: true,
        user_instructions:
            "create a rosting post about when pakistan difence minsiter said it's all over social media when he asked about their claims of shooting down indian fighter jets in recent india pakistan conflict.also create a funny image about it.",
    }),
);

const messages: BaseMessage[] = [
    new SystemMessage(postCreationPrompt),
    humanMessage,
];

const response = await postWorkflow.invoke({ messages: messages }, config);
console.log(postWorkflow.getState(config).then(res => console.log(res)));

console.log(response);
