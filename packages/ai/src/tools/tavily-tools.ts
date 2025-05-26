import { TavilySearch, TavilyExtract } from "@langchain/tavily";

const tavilyApiKey = process.env.TAVILY_API_KEY;

if (!tavilyApiKey) {
    throw new Error("TAVILY_API_KEY is not set");
}

const tavilySearch = new TavilySearch({
    name: "search",
    tavilyApiKey: tavilyApiKey,
});

const tavilyExtract = new TavilyExtract({
    name: "extract",
    tavilyApiKey: tavilyApiKey,
});


export { tavilySearch, tavilyExtract };
