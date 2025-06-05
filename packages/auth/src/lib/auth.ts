import db from "@repo/db";
import { sendEmail } from "@repo/mailer";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
    generateEmailVerificationEmail,
    generatePasswordResetEmail,
} from "@repo/mail-templates";

const auth = betterAuth({
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 5, // 5 minutes
        },
    },
    trustedOrigins: [...(process.env.TRUSTED_ORIGINS?.split(",") || [])],
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        sendResetPassword: async ({ user, url }) => {
            await sendEmail({
                to: [
                    {
                        email: user.email,
                        name: user.name || "User",
                    },
                ],
                sender: {
                    name: "Postcribe",
                    email: "noreply@postcribe.com",
                },
                subject: "Reset your password",
                htmlContent: generatePasswordResetEmail({
                    userName: user.name || "User",
                    resetUrl: url,
                    expiresIn: "1 hour",
                }),
            });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            await sendEmail({
                to: [
                    {
                        email: user.email,
                        name: user.name || "User",
                    },
                ],
                sender: {
                    name: "Postcribe",
                    email: "noreply@postcribe.com",
                },
                subject: "Verify your email",
                htmlContent: generateEmailVerificationEmail({
                    userName: user.name || "User",
                    verificationUrl: url,
                    expiresIn: "24 hours",
                }),
            });
        },
    },
    user: {
        additionalFields: {
            timeZone: {
                type: "string",
                required: false,
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
        // Add more social providers as needed
    },
});

export { auth };
