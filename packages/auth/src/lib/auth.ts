import db from "@repo/db";
import { betterAuth } from "better-auth";

import { prismaAdapter } from "better-auth/adapters/prisma";

const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            timeZone: {
                type: "string",
                required: true,
            },
        },
    },
});

export { auth };
