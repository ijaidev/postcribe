import type { PostCronData } from "@repo/db";

export type PostCron = {
    id: string;
    title: string;
    scheduledAt: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    PostCronData: PostCronData;
};