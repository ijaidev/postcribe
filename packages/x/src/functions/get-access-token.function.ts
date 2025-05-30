import db from "@repo/db";
import { refreshAccessToken, isTokenExpired } from "../client";

export interface AccessTokenResult {
    accessToken: string;
}

/**
 * Get a valid access token from database, automatically refreshing if expired
 * @param socialLoginId - Social login record ID
 * @returns Promise with valid access token and metadata
 */
export async function getValidAccessToken(
    socialLoginId: string,
): Promise<AccessTokenResult> {
    try {
        // Find the user's X social login record
        const socialLogin = await db.socialLogin.findUnique({
            where: {
                id: socialLoginId,
            },
        });

        if (!socialLogin) {
            throw new Error("X account not connected for this user");
        }

        if (!socialLogin.accessToken) {
            throw new Error("X access token not available");
        }

        if (!socialLogin.refreshToken) {
            throw new Error("X refresh token not available for token refresh");
        }

        // Check if access token is expired (with 5 minute buffer)
        const isExpired = isTokenExpired(socialLogin.expiresAt, 5);

        if (!isExpired) {
            // Token is still valid, return it
            return {
                accessToken: socialLogin.accessToken,
            };
        }

        const refreshResult = await refreshAccessToken(
            socialLogin.refreshToken,
        );

        const newExpiresAt = new Date(
            Date.now() + refreshResult.expiresIn * 1000,
        );

        // Update the database with new tokens
        await db.socialLogin.update({
            where: {
                id: socialLogin.id,
            },
            data: {
                accessToken: refreshResult.accessToken,
                expiresAt: newExpiresAt,
                refreshToken: refreshResult.refreshToken || socialLogin.refreshToken,
            },
        });

        return {
            accessToken: refreshResult.accessToken,
        };
    } catch (error) {
        await db.socialLogin.update({
            where: {
                id: socialLoginId,
            },
            data: {
                isConnected: false,
            },
        });

        console.error("Error getting valid X access token:", error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes("not connected")) {
                throw new Error(
                    "X account not connected. Please authenticate with X first.",
                );
            }

            if (error.message.includes("refresh")) {
                throw new Error(
                    "Failed to refresh X access token. Please re-authenticate with X.",
                );
            }
        }

        throw new Error("Failed to get valid X access token");
    }
}
