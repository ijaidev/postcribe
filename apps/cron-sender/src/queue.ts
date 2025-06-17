import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const queue = new SQSClient({});

const sendMessage = async (message: string) => {
    const command = new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: message,
    });

    return await queue.send(command);
};

export default sendMessage;
