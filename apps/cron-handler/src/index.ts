import { app, InvocationContext } from "@azure/functions";
import type { CronMessage } from "@repo/cron-sender";
import processCron from "./main";
import { logger } from "@repo/logger";

// Queue trigger handler
async function processScheduledPost(
    queueItem: unknown,
    context: InvocationContext,
): Promise<void> {
    const dequeueCount = context.triggerMetadata?.dequeueCount as number;
    let retry = false;

    if (dequeueCount > 1) {
        retry = true;
    }
    const data = queueItem as CronMessage;

    logger.info({ data, retry }, "Processing cron message");
    await processCron(data, retry);
}

// Register the function with a queue trigger
app.storageQueue("processScheduledPost", {
    queueName: "post-schedule-queue", // The same queue name as used in sender!
    connection: "AzureWebJobsStorage", // Match your sender's connection
    handler: processScheduledPost,
});
