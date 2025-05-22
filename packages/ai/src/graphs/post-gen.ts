import { ChatOpenAI } from "@langchain/openai";
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
import { postGraphState } from "../graph-states";
import responseTool from "../tools/post-structure.tool";
import systemPrompts from "../config/system-prompts";
import dateTimeTool from "../tools/date-time.tool";
import { tavilyExtract, tavilySearch } from "../tools/tavily-tools";

const model = new ChatOpenAI({
    model: "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 1,
});

const checkPointer = new MemorySaver();

const tools = [dateTimeTool, tavilySearch, tavilyExtract, responseTool];

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

const postGraph = new StateGraph(postGraphState)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addEdge("toolNode", "modelCall")
    .compile({ checkpointer: checkPointer });

const config: LangGraphRunnableConfig = {
    configurable: {
        thread_id: Math.random().toString(36).substring(2, 15),
    },
};

let messages: BaseMessage[] = [
    new SystemMessage(systemPrompts.xPrompt),
    new HumanMessage(
        "create a rosting post about when pakistan difence minsiter said it's all over social media when he asked about their claims of shooting down indian fighter jets in recent india pakistan conflict.",
    )
];

let i = 0;
while (true) {
    if (i > 0) {
        const message = prompt("Enter a message: ");
        messages = [new HumanMessage(message || "")];
    }
    const response = await postGraph.invoke(
        { messages: messages },
        {
            maxConcurrency: 5,
            configurable: config.configurable,
            streamMode: "values",
        },
    );

    console.log(response.posts);
    i++;
}
// for await (const { event, data } of response) {
//     console.log(event, data);
// }

// for await (const message of response) {
//     console.log(message);
// }

// const humanMessage = new HumanMessage(
//     JSON.stringify({
//         system_config: {
//             platform: "x",
//             mode: "generate",
//             image: false,
//         },
//         user_input:
//             "create a rosting post about when pakistan difence minsiter said it's all over social media when he asked about their claims of shooting down indian fighter jets in recent india pakistan conflict.also create a funny image about it.",
//     }),
// );

// let messages: BaseMessage[] = [
//     new SystemMessage(postCreationPrompt),
//     humanMessage,
// ];

// let i = 0;
// while (true) {
//     if (i > 0) {
//         const message = prompt("Enter a message: ");
//         const enhandMessage = new HumanMessage(
//             JSON.stringify({
//                 system_config: {
//                     platform: "x",
//                     mode: "generate",
//                     image: false,
//                 },
//                 user_input: message,
//             }),
//         );
//         messages = [enhandMessage];
//     }
//     const response = await postWorkflow.invoke({ messages: messages }, config);
//     console.log(response.posts);
//     i++;
// }
