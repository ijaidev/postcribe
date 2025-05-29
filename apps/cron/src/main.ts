import db from "@repo/db";
import sendMessage from "./queue";

const getCrons = async () => {
    const currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() + 5);
    const scheduledAt = currentDate.toISOString();

    const crons = await db.postCron.findMany({
        where: {
            scheduledAt: {
                lte: scheduledAt,
            },
        },
        select: {
            id: true,
            userId: true,
        },
    });

    return crons;
};

const main = async () => {
    const crons = await getCrons();

    for (const cron of crons) {
        sendMessage(JSON.stringify(cron));
    }
};

export default main;
