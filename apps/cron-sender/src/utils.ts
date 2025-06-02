import { RepeatIntervalUnit } from "@repo/db";

export const getNextRunAt = (
    scheduledAt: Date,
    pastNextRunAt: Date,
    repeatInterval: number,
    repeatIntervalUnit: RepeatIntervalUnit,
) => {
    const scheduledDate = new Date(scheduledAt);
    const pastNextRunDate = new Date(pastNextRunAt);
    let nextRunAt = new Date();
    switch (repeatIntervalUnit) {
        case RepeatIntervalUnit.MINUTE:
            nextRunAt.setMinutes(pastNextRunDate.getMinutes() + repeatInterval);
            break;
        case RepeatIntervalUnit.HOUR:
            nextRunAt.setHours(pastNextRunDate.getHours() + repeatInterval);
            break;
        case RepeatIntervalUnit.DAY:
            nextRunAt.setDate(pastNextRunDate.getDate() + repeatInterval);
            nextRunAt.setHours(scheduledDate.getHours());
            nextRunAt.setMinutes(scheduledDate.getMinutes());
            nextRunAt.setSeconds(scheduledDate.getSeconds());
            break;
        case RepeatIntervalUnit.WEEK:
            nextRunAt.setDate(pastNextRunDate.getDate() + repeatInterval * 7);
            nextRunAt.setHours(scheduledDate.getHours());
            nextRunAt.setMinutes(scheduledDate.getMinutes());
            nextRunAt.setSeconds(scheduledDate.getSeconds());
            break;
        case RepeatIntervalUnit.MONTH:
            nextRunAt.setMonth(pastNextRunDate.getMonth() + repeatInterval);
            nextRunAt.setDate(scheduledDate.getDate());
            nextRunAt.setHours(scheduledDate.getHours());
            nextRunAt.setMinutes(scheduledDate.getMinutes());
            nextRunAt.setSeconds(scheduledDate.getSeconds());
            break;
        default:
            throw new Error("Invalid repeat interval unit");
    }
    return nextRunAt.toISOString();
};

