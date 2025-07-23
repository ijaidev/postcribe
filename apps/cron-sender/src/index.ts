import { app, InvocationContext, output } from "@azure/functions";
import type { Timer } from "@azure/functions";

const queueOutput = output.storageQueue({
    queueName: "post-schedule-queue",
    connection: "AzureWebJobsStorage",
});

import getCronMessages from "./main";
import { logger } from "@repo/logger";

async function queueSender(
    myTimer: Timer,
    context: InvocationContext,
): Promise<void> {
    try {
        const timeStamp = new Date().toISOString();
        logger.info(`Scheduled post sender function executed at: ${timeStamp}`);

        const cronMessages = await getCronMessages();

        if (cronMessages.length > 0) {
            // In v4, we use context.extraOutputs for queue output
            context.extraOutputs.set(queueOutput, cronMessages);
            logger.info(
                `Message sent to queue: ${JSON.stringify(cronMessages)}`,
            );
        } else {
            logger.info("No cron messages to process");
        }
    } catch (error) {
        logger.error({ error }, "Error in scheduled function");
        throw error;
    }
}

app.timer("queueSender", {
    schedule: "0 * * * * *",
    handler: queueSender,
    extraOutputs: [queueOutput],
});

export { type CronMessage } from "./types";
