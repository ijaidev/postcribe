import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
import { z } from "zod";

const dateTimeSchema = z.object({
    format: z
        .enum(["full", "short", "time", "date"])
        .describe("The format of the date/time to return"),
    timezone: z
        .string()
        .optional()
        .describe(
            "The timezone to use (e.g. 'UTC', 'America/New_York'). Defaults to UTC",
        ),
});

type DateTimeArgs = z.infer<typeof dateTimeSchema>;

const dateTimeToolSchema: StructuredToolParams = {
    name: "get_date_time",
    description: JSON.stringify({
        zIndex: 0,
        description: "Get current date and time in specified format. If you need to current date/time to do something, must use this tool.",
    }),
    schema: dateTimeSchema,
};

const dateTimeTool = tool(
    async (args: DateTimeArgs, config: ToolRunnableConfig) => {
        const { format, timezone = "UTC" } = args;
        const date = new Date();

        let formattedDate: string;
        switch (format) {
            case "full":
                formattedDate = date.toLocaleString("en-US", {
                    timeZone: timezone,
                    dateStyle: "full",
                    timeStyle: "full",
                });
                break;
            case "short":
                formattedDate = date.toLocaleString("en-US", {
                    timeZone: timezone,
                    dateStyle: "short",
                    timeStyle: "short",
                });
                break;
            case "time":
                formattedDate = date.toLocaleTimeString("en-US", {
                    timeZone: timezone,
                    timeStyle: "medium",
                });
                break;
            case "date":
                formattedDate = date.toLocaleDateString("en-US", {
                    timeZone: timezone,
                    dateStyle: "medium",
                });
                break;
        }

        return {
            dateTime: formattedDate,
        };
    },
    dateTimeToolSchema,
);

export default dateTimeTool;
