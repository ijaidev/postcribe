import { InferResponseType } from "hono";
import client from "@/lib/hono-client";

type Data = InferResponseType<typeof client.post.draft.posts.$get>["data"];
export type PostData = Omit<NonNullable<Data>["x"]["posts"][number], "options">;
export type ImageData = NonNullable<Data>["x"]["images"][number];

export interface DraftState {
    posts: PostData[];
    images: ImageData[];
    currentPostVersion: number;
    currentImageVersion: number;
}
