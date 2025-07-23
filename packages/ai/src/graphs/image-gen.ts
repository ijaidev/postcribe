import { AzureChatOpenAI } from "@langchain/openai";
import {
    END,
    START,
    StateGraph,
    type LangGraphRunnableConfig,
} from "@langchain/langgraph";
import { AIMessage, SystemMessage } from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
    imageGraphConfig,
    imageGraphState,
    postGraphState,
} from "../graph-states";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import imageEditTool from "../tools/image-edit-tool";
import ImageGenTool from "../tools/image-gen.tool";
import { getImagePrompt } from "../config/system-prompts";
import { linkedInPostGraph, xPostGraph } from "./post-gen";

// const model = new ChatOpenAI({
//     model: "gpt-4.1",
//     apiKey: process.env.OPENAI_API_KEY,
//     temperature: 0.9,
// });

const model = new AzureChatOpenAI({
    model: "gpt-4.1",
    temperature: 0.9,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiDeploymentName: "gpt-4.1",
    azureOpenAIApiVersion: "2024-04-01-preview",
});

const xCheckPointer = PostgresSaver.fromConnString(
    process.env.AI_DB_URL || "",
    {
        schema: "x_image_gen",
    },
);

const linkedInCheckPointer = PostgresSaver.fromConnString(
    process.env.AI_DB_URL || "",
    {
        schema: "linkedin_image_gen",
    },
);

const setupCheckpointer = async () => {
    await xCheckPointer.setup();
    await linkedInCheckPointer.setup();
};

setupCheckpointer();

const tools = [ImageGenTool, imageEditTool];

const toolNode = new ToolNode<imageGraphState>(tools);

const isToolCallNode = (state: imageGraphState): "toolNode" | typeof END => {
    const { messages } = state;
    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return "__end__";
    }
    return "toolNode";
};

const modelWithTools = model.bindTools(tools);

const modelCallNode = async (
    state: imageGraphState,
    config: LangGraphRunnableConfig<imageGraphConfig>,
): Promise<imageGraphState> => {
    const { messages } = state;
    const platform = config.configurable?.platform;
    const threadId = config.configurable?.thread_id;
    if (!platform || !threadId)
        throw new Error("Platform and threadId are required");
    const graph = platform === "X" ? xPostGraph : linkedInPostGraph;
    const postGraphState = await graph.getState({
        configurable: {
            thread_id: threadId,
        },
    });
    const values = postGraphState?.values as unknown as postGraphState;
    const context = JSON.stringify(values);
    if (!context) throw new Error("No post found to generate image for");
    const systemPrompt = getImagePrompt(
        platform.toLowerCase() as "x" | "linkedin",
        JSON.stringify(context),
    );
    const response = await modelWithTools.invoke([
        new SystemMessage(systemPrompt),
        ...messages,
    ]);
    return {
        messages: [response],
        images: [],
    };
};

const xImageGraph = new StateGraph(imageGraphState, imageGraphConfig)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addEdge("toolNode", END)
    .compile({ checkpointer: xCheckPointer });

const linkedInImageGraph = new StateGraph(imageGraphState, imageGraphConfig)
    .addNode("modelCall", modelCallNode)
    .addNode("toolNode", toolNode)
    .addEdge(START, "modelCall")
    .addConditionalEdges("modelCall", isToolCallNode)
    .addEdge("toolNode", END)
    .compile({ checkpointer: linkedInCheckPointer });

export { xImageGraph, linkedInImageGraph };
