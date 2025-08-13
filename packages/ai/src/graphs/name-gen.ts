import { AzureChatOpenAI } from "@langchain/openai";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { getNameGenPrompt } from "../config/system-prompts";
import dotenv from "dotenv";
dotenv.config();

const model = new AzureChatOpenAI({
    model: "gpt-4.1-mini",
    temperature: 0.8,
    azureOpenAIEndpoint: process.env.AZURE_OPENAI_ENDPOINT,
    azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureOpenAIApiDeploymentName: "gpt-4.1-mini",
    azureOpenAIApiVersion: "2024-04-01-preview",
});

export async function generateNameFromDiscussion(
    messages: BaseMessage[],
): Promise<string> {
    const prompt = getNameGenPrompt();
    const response = await model.invoke([
        new SystemMessage(prompt),
        ...messages,
    ]);
    if (!response || typeof response.content !== "string") {
        throw new Error("No name generated");
    }
    return response.content.trim();
}
