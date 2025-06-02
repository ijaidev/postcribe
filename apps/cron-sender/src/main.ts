import db from "@repo/db";
import sendMessage from "./queue";
import type { CronMessage } from "./types";
import { getNextRunAt } from "./utils";

const getCrons = async () => {
    const crons = await db.postCron.findMany({
        where: {
            nextRunAt: {
                lte: new Date().toISOString(),
            },
            isDeleted: false,
        },
        select: {
            id: true,
            userId: true,
            scheduledAt: true,
            nextRunAt: true,
            repeatInterval: true,
            repeatIntervalUnit: true,
        },
    });

    return crons;
};

const main = async () => {
    const crons = await getCrons();
    if (crons.length === 0) return;
    for (const cron of crons) {
        const nextRunAt = getNextRunAt(
            cron.scheduledAt,
            cron.nextRunAt,
            cron.repeatInterval,
            cron.repeatIntervalUnit,
        );
        const cronMessage: CronMessage = {
            id: cron.id,
            userId: cron.userId,
        };
        sendMessage(JSON.stringify(cronMessage));
        await db.postCron.update({
            where: { id: cron.id },
            data: { nextRunAt: nextRunAt },
        });
    }
};

export default main;
