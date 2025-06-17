import {
    tool,
    type StructuredToolParams,
    type ToolRunnableConfig,
} from "@langchain/core/tools";
import { z } from "zod";

const dateTimeSchema = z.object({
    format: z
        .string()
        .default("YYYY-MM-DD HH:mm:ss")
        .describe(
            "Date/time format string (e.g., 'YYYY-MM-DD', 'dddd, MMMM Do YYYY', 'HH:mm z', 'full', 'short', 'time', 'date')",
        ),
    timezone: z
        .string()
        .default("UTC")
        .describe(
            "Timezone identifier (e.g., 'UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo')",
        ),
    includeContext: z
        .boolean()
        .default(true)
        .describe(
            "Whether to include contextual information like day of week, season, etc.",
        ),
});

type DateTimeArgs = z.infer<typeof dateTimeSchema>;

const dateTimeToolSchema: StructuredToolParams = {
    name: "get_date_time",
    description:
        "Get current date, time, and temporal context. Essential for time-sensitive content, current events, seasonal references, or any content requiring accurate temporal information.",
    schema: dateTimeSchema,
};

const dateTimeTool = tool(
    async (args: DateTimeArgs, config: ToolRunnableConfig) => {
        const { format, timezone, includeContext } = args;
        const date = new Date();

        let formattedDate: string;

        // Handle preset formats
        switch (format.toLowerCase()) {
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
            default:
                // Use custom format string
                formattedDate = date.toLocaleString("en-US", {
                    timeZone: timezone,
                });
                break;
        }

        // Add contextual information
        let contextInfo = {};
        if (includeContext) {
            const dayOfWeek = date.toLocaleDateString("en-US", {
                timeZone: timezone,
                weekday: "long",
            });
            const month = date.getMonth() + 1;
            const timeString = date.toLocaleTimeString("en-US", {
                timeZone: timezone,
                hour12: false,
            });
            const hour = parseInt(timeString.split(":")[0] || "0");

            // Determine season (Northern Hemisphere)
            let season = "";
            if (month >= 3 && month <= 5) season = "Spring";
            else if (month >= 6 && month <= 8) season = "Summer";
            else if (month >= 9 && month <= 11) season = "Fall";
            else season = "Winter";

            // Determine time of day
            let timeOfDay = "";
            if (hour >= 5 && hour < 12) timeOfDay = "Morning";
            else if (hour >= 12 && hour < 17) timeOfDay = "Afternoon";
            else if (hour >= 17 && hour < 21) timeOfDay = "Evening";
            else timeOfDay = "Night";

            contextInfo = {
                dayOfWeek,
                season,
                timeOfDay,
                isWeekend: dayOfWeek === "Saturday" || dayOfWeek === "Sunday",
                timezone,
            };
        }

        return {
            dateTime: formattedDate,
            context: includeContext ? contextInfo : undefined,
        };
    },
    dateTimeToolSchema,
);

export default dateTimeTool;
