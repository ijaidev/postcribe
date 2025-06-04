import { BETTER_AUTH_URL } from "@/config";
import { auth } from "@repo/auth";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: BETTER_AUTH_URL,
    plugins: [inferAdditionalFields<typeof auth>()],
});
