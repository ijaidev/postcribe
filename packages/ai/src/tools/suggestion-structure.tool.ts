import { tool, type StructuredToolParams } from "@langchain/core/tools";
import { z } from "zod";

const suggestionStructureSchema = z.object({
    suggestions: z
        .array(z.string())
        .describe(
            "Array of Prompt suggestions that can be fed to AI post generation agents",
        ),
});

export type SuggestionStructureArgs = z.infer<typeof suggestionStructureSchema>;

const suggestionStructureToolSchema: StructuredToolParams = {
    name: "response",
    description:
        "MANDATORY final tool for delivering personalized prompt suggestions that can be fed to AI post generation agents. This tool must be called last in every suggestion workflow.",
    schema: suggestionStructureSchema,
};

const suggestionResponseTool = tool(async (args: SuggestionStructureArgs) => {
    return "Message delivered to the user";
}, suggestionStructureToolSchema);

export default suggestionResponseTool;
