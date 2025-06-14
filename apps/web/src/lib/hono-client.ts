import { hc } from "hono/client";
import type { AppType } from "@repo/api";
import { API_URL } from "@/config";

const client = hc<AppType>(API_URL, {
    fetch: ((input, init) => {
        return fetch(input, {
            ...init,
            credentials: "include",
        });
    }) as typeof fetch,
});

export default client;
