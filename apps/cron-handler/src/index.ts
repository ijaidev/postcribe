import { QueueServiceClient } from "@azure/storage-queue";
import type { CronMessage } from "@repo/cron-sender";
import processCron from "./main";
import { logger } from "@repo/logger";

function parseQueueMessageText<T>(messageText: string): T {
    try {
        return JSON.parse(messageText) as T;
    } catch {
        try {
            const decoded = Buffer.from(messageText, "base64").toString("utf8");
            return JSON.parse(decoded) as T;
        } catch (error) {
            throw new Error(
                "Failed to parse queue message: expected JSON or base64-encoded JSON",
            );
        }
    }
}

// Queue trigger handler
async function main(): Promise<void> {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const queueName =
        process.env.AZURE_STORAGE_QUEUE_NAME || "post-schedule-queue";

    if (!connectionString || !queueName) {
        throw new Error("Missing required environment variables");
    }

    const queueServiceClient =
        QueueServiceClient.fromConnectionString(connectionString);
    const queueClient = queueServiceClient.getQueueClient(queueName);

    const messages = await queueClient.receiveMessages({ numberOfMessages: 1 });

    if (messages.receivedMessageItems.length === 0) {
        logger.info("No messages to process");
        return;
    }

    const message = messages.receivedMessageItems[0];

    if (message?.dequeueCount && message.dequeueCount > 3) {
        logger.info(
            { messageId: message.messageId },
            "Message dequeued too many times, skipping",
        );
        await queueClient.deleteMessage(message.messageId, message.popReceipt);
        return;
    }

    if (!message) {
        logger.error("No message received");
        return;
    }

    const isRetry = message.dequeueCount > 1;

    const data = parseQueueMessageText<CronMessage>(message.messageText);

    logger.info({ data, isRetry }, "Processing cron message");

    await processCron(data, isRetry);

    await queueClient.deleteMessage(message.messageId, message.popReceipt);

    logger.info(
        { messageId: message.messageId },
        "Message processed and deleted",
    );
}

main();
