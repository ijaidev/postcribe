import {
    type SQSEvent,
    type Context,
    type SQSHandler,
    type SQSRecord,
} from "aws-lambda";
import main from "./main";
import { type CronMessage } from "@repo/cron-sender/types";

export const handler: SQSHandler = async (
    event: SQSEvent,
    context: Context,
): Promise<void> => {
    for (const message of event.Records) {
        const cronMessage = JSON.parse(message.body) as CronMessage;
        await main(cronMessage);
    }
};
