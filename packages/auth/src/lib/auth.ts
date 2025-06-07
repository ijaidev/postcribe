import db from "@repo/db";
import { sendEmail } from "@repo/mailer";
import { betterAuth, type User } from "better-auth";
import { logger } from "@repo/logger";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
    generateEmailVerificationEmail,
    generatePasswordResetEmail,
} from "@repo/mail-templates";
import { getRedisClient } from "./redis-client";
import { IANAZone } from "luxon";

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3001";

// Get Redis client instance
const redis = getRedisClient();

// Connect to Redis with proper error handling
if (redis) {
    redis.connect().catch(err => {
        logger.error("❌ Redis connection failed:", err);
    });
}

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
        if (lastEmail && timeSinceLastEmail < 60 * 1000) {
            throw new APIError("TOO_MANY_REQUESTS", {
                message: `Please wait at least one minute before requesting another ${type} email.`,
                code: "TOO_MANY_REQUESTS",
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
            code: "TOO_MANY_REQUESTS",
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
            code: "TOO_MANY_REQUESTS",
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
            code: "INTERNAL_SERVER_ERROR",
        });
    }
};

const auth = betterAuth({
    basePath: "/auth",
    rateLimit: {
        enabled: true,
        window: 10, // 10 seconds for testing
        max: 5, // 5 requests per window
        customRules: {
            "/sign-in/email": {
                window: 60,
                max: 3, // 3 sign-in attempts per 60 seconds
            },
            "sign-up/email": {
                window: 60,
                max: 3, // 3 sign-up attempts per 60 seconds
            },
        },
        storage: "secondary-storage",
    },
    secondaryStorage: {
        get: async key => {
            try {
                return await redis.get(key);
            } catch (error) {
                logger.error("❌ Redis GET error:", error);
                return null;
            }
        },
        set: async (key, value, ttl) => {
            try {
                if (ttl) {
                    await redis.set(key, value, "EX", ttl);
                } else {
                    await redis.set(key, value);
                }
            } catch (error) {
                logger.error("❌ Redis SET error:" + error);
            }
        },
        delete: async key => {
            try {
                await redis.del(key);
            } catch (error) {
                logger.error("❌ Redis DEL error:" + error);
            }
        },
    },
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
                    verificationUrl: `${CLIENT_URL}/verify-email?mail=${user.email}&token=${token}`,
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
    databaseHooks: {
        user: {
            create: {
                before: async (user: User & { timeZone?: string }) => {
                    // Validate timezone if provided
                    if (user.timeZone && user.timeZone.trim() !== "") {
                        if (!IANAZone.isValidZone(user.timeZone)) {
                            throw new APIError("BAD_REQUEST", {
                                message: `Invalid timezone: ${user.timeZone}. Please provide a valid IANA timezone identifier (e.g., 'America/New_York', 'Europe/London').`,
                                code: "INVALID_TIMEZONE",
                            });
                        }
                    }
                    return { data: user };
                },
            },
            update: {
                before: async (userData: Partial<User> & { timeZone?: string }) => {
                    // Validate timezone if being updated
                    if (userData.timeZone !== undefined && userData.timeZone && userData.timeZone.trim() !== "") {
                        if (!IANAZone.isValidZone(userData.timeZone)) {
                            throw new APIError("BAD_REQUEST", {
                                message: `Invalid timezone: ${userData.timeZone}. Please provide a valid IANA timezone identifier (e.g., 'America/New_York', 'Europe/London').`,
                                code: "INVALID_TIMEZONE",
                            });
                        }
                    }
                    return { data: userData };
                },
            },
        },
    },
});

export { auth };
