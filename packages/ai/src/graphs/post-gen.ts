import { ChatOpenAI } from "@langchain/openai";
import {
    END,
    START,
    StateGraph,
} from "@langchain/langgraph";
import {
    AIMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import responseTool from "../tools/post-structure.tool";
import dateTimeTool from "../tools/date-time.tool";
import { tavilyExtract, tavilySearch } from "../tools/tavily-tools";
import { linkedInPostGraphState, xPostGraphState, type postGraphState } from "../graph-states";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";

const model = new ChatOpenAI({
    model: "gpt-4.1",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.9,
});


const xCheckPointer = PostgresSaver.fromConnString(
    process.env.AI_DB_URL || "",
    {
        schema: "x_post_gen",
    }
);

const linkedInCheckPointer = PostgresSaver.fromConnString(
    process.env.AI_DB_URL || "",
    {
        schema: "linkedin_post_gen",
    }
);

await xCheckPointer.setup();
await linkedInCheckPointer.setup();

const tools = [dateTimeTool, tavilySearch, tavilyExtract, responseTool];

const toolNode = new ToolNode<postGraphState>(tools);

const isToolCallNode = (
    state: postGraphState,
): "toolNode" | typeof END => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return "__end__";
    }
    return "toolNode";
};

const isModelCallNode = (
    state: postGraphState,
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
    state: postGraphState,
): Promise<postGraphState> => {
    const { messages } = state;
    const response = await modelWithTools.invoke(messages);
    return {
        messages: [response],
        posts: [],
    };
};

const xPostGraph = new StateGraph(xPostGraphState)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addConditionalEdges("toolNode", isModelCallNode)
    .compile({ checkpointer: xCheckPointer });

const linkedInPostGraph = new StateGraph(linkedInPostGraphState)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addConditionalEdges("toolNode", isModelCallNode)
    .compile({ checkpointer: linkedInCheckPointer });


export {
    xPostGraph,
    linkedInPostGraph,
};
