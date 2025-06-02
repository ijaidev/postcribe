import type { EventBridgeEvent, ScheduledHandler } from "aws-lambda";
import { logger } from "@repo/logger";
import { processScheduledDraft } from "./main";

interface ScheduleEvent {
    draftId: string;
}

export const handler: ScheduledHandler = async (
    event: EventBridgeEvent<string, ScheduleEvent>,
) => {
    try {
        const { draftId } = event.detail;
        await processScheduledDraft(draftId);
    } catch (error) {
        logger.error("Failed to process scheduled draft", {
            draftId: event.detail.draftId,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
    }
};
