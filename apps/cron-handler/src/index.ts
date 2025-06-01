import { type SQSEvent, type SQSHandler } from "aws-lambda";
import main from "./main";
import { type CronMessage } from "@repo/cron-sender/types";
import { logger } from "@repo/logger";
import { DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export const handler: SQSHandler = async (event: SQSEvent): Promise<void> => {
    const sqsClient = new SQSClient({});

    for (const record of event.Records) {
        try {
            const cronMessage = JSON.parse(record.body) as CronMessage;

            const isRetry =
                record.attributes?.ApproximateReceiveCount &&
                parseInt(record.attributes.ApproximateReceiveCount) > 1;
            await main(cronMessage, Boolean(isRetry));

            const deleteMessageCommand = new DeleteMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL,
                ReceiptHandle: record.receiptHandle,
            });

            await sqsClient.send(deleteMessageCommand);
        } catch (error) {
            logger.error(
                `Failed to process message ${record.messageId}:`,
                error,
                {
                    messageBody: record.body,
                    receiveCount: record.attributes?.ApproximateReceiveCount,
                    errorType:
                        error instanceof Error
                            ? error.constructor.name
                            : "Unknown",
                },
            );

            throw error;
        }
    }
};
