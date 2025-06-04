import db from "@repo/db";
import { betterAuth } from "better-auth";

import { prismaAdapter } from "better-auth/adapters/prisma";

const auth = betterAuth({
    session: {

    },
    trustedOrigins: [...(process.env.TRUSTED_ORIGINS?.split(",") || [])],
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            timeZone: {
                type: "string"
            },
        },
    },
    socialProviders: {
        google: {
            enabled: true,
            prompt: "select_account",
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});

export { auth };
