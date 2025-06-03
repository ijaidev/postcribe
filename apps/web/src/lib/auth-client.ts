import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { auth } from "@repo/auth"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_AUTH_URL,
    plugins: [
        inferAdditionalFields<typeof auth>()
    ]
})

authClient.signIn.email({
    email: "test@test.com",
    password: "test",
    timeZone: "Europe/Moscow",
})