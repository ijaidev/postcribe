import db from "@repo/db";
import { sendEmail } from "@repo/mailer";
import { betterAuth, logger } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
    generateEmailVerificationEmail,
    generatePasswordResetEmail,
} from "@repo/mail-templates";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3001";

// Custom email rate limiting helper
const checkEmailRateLimit = async (
    email: string,
    type: "verification" | "reset",
) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const lastEmail = await db.emailLog.findFirst({
        where: {
            email: email,
            type: type,
        },
        orderBy: {
            sentAt: "desc",
        },
    });

    if (lastEmail) {
        const timeSinceLastEmail = now.getTime() - lastEmail.sentAt.getTime();
        if (timeSinceLastEmail < 60 * 1000) {
            throw new APIError("TOO_MANY_REQUESTS", {
                message: `Please wait at least one minute before requesting another ${type} email.`,
            });
        }
    }

    // Check emails in the last 24 hours
    const recentDailyEmails = await db.emailLog.count({
        where: {
            email: email,
            type: type,
            sentAt: {
                gte: oneDayAgo,
            },
        },
    });

    // If user has sent 3 emails in one day, require support contact
    if (recentDailyEmails >= 5) {
        throw new APIError("TOO_MANY_REQUESTS", {
            message: `You've reached the daily limit for ${type} emails. Please contact support if you need further assistance.`,
        });
    }

    // Check emails in the last hour
    const recentHourlyEmails = await db.emailLog.count({
        where: {
            email: email,
            type: type,
            sentAt: {
                gte: oneHourAgo,
            },
        },
    });

    // Allow max 3 emails per hour (to prevent immediate spam)
    if (recentHourlyEmails >= 3) {
        throw new APIError("TOO_MANY_REQUESTS", {
            message: `Too many ${type} emails sent recently. Please wait at least one hour before requesting another.`,
        });
    }

    // Log this email attempt
    try {
        await db.emailLog.create({
            data: {
                email: email,
                type: type,
                sentAt: now,
            },
        });
    } catch (error) {
        logger.error(error as string);
        throw new APIError("INTERNAL_SERVER_ERROR", {
            message: "Failed to send email",
        });
    }
};

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
        sendResetPassword: async ({ user, url, token }) => {
            await checkEmailRateLimit(user.email, "reset");

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
                    resetUrl: `${CLIENT_URL}/reset-password?token=${token}`,
                    expiresIn: "1 hour",
                }),
            });
        },
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url, token }) => {
            await checkEmailRateLimit(user.email, "verification");

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
                    verificationUrl: `${CLIENT_URL}/verify-email?token=${token}`,
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
