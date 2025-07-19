import db from "@repo/db";
import { getNextRunAt } from "./utils";

const getCrons = async () => {
    const crons = await db.postCron.findMany({
        where: {
            nextRunAt: {
                lte: new Date(
                    new Date().setMinutes(new Date().getMinutes() + 5),
                ).toISOString(),
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

const getCronMessages = async (): Promise<string[]> => {
    const crons = await getCrons();
    if (crons.length === 0) return [];
    const cronMessages: string[] = [];
    for (const cron of crons) {
        const nextRunAt = getNextRunAt(
            cron.scheduledAt,
            cron.nextRunAt,
            cron.repeatInterval,
            cron.repeatIntervalUnit,
        );
        cronMessages.push(
            JSON.stringify({
                id: cron.id,
                userId: cron.userId,
            }),
        );
        await db.postCron.update({
            where: { id: cron.id },
            data: { nextRunAt: nextRunAt },
        });
    }
    return cronMessages;
};

export default getCronMessages;
