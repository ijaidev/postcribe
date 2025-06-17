import { createLinkedInClient } from "../client";
import { logger } from "@repo/logger";

export interface LinkedInProfile {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    headline?: string;
    profilePicture?: {
        displayImage: string;
    };
    vanityName?: string;
    location?: {
        name: string;
        country: string;
    };
}

/**
 * Get LinkedIn user profile information using the /me endpoint
 * @param accessToken - LinkedIn access token
 * @returns User profile information
 */
export async function getProfile(
    accessToken: string,
): Promise<LinkedInProfile> {
    try {
        const client = createLinkedInClient();

        // Get basic profile information using the /me endpoint as shown in docs
        const response = await client.get({
            resourcePath: "/me",
            accessToken,
        });

        const profileData = response.data;

        return {
            id: profileData.id,
            firstName:
                profileData.firstName?.localized?.en_US ||
                profileData.firstName?.preferredLocale?.language ||
                "",
            lastName:
                profileData.lastName?.localized?.en_US ||
                profileData.lastName?.preferredLocale?.language ||
                "",
            email: profileData.email,
            headline: profileData.headline?.localized?.en_US || "",
            profilePicture: profileData.profilePicture
                ? {
                      displayImage:
                          profileData.profilePicture.displayImage || "",
                  }
                : undefined,
            vanityName: profileData.vanityName,
            location: profileData.location
                ? {
                      name: profileData.location.name || "",
                      country: profileData.location.country || "",
                  }
                : undefined,
        };
    } catch (error) {
        logger.error({ error }, "Error fetching LinkedIn profile");

        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("unauthorized")
            ) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (
                error.message.includes("403") ||
                error.message.includes("forbidden")
            ) {
                throw new Error(
                    "Insufficient permissions to access LinkedIn profile",
                );
            }
        }

        throw new Error("Failed to fetch LinkedIn profile");
    }
}

/**
 * Get detailed LinkedIn profile information using /people/~ with projections
 * @param accessToken - LinkedIn access token
 * @param fields - Specific fields to retrieve (optional)
 * @returns Detailed user profile information
 */
export async function getDetailedProfile(
    accessToken: string,
    fields: string = "id,firstName,lastName,headline,profilePicture(displayImage~:playableStreams),vanityName,location",
): Promise<any> {
    try {
        const client = createLinkedInClient();

        // Get detailed profile information using projections as shown in docs
        const response = await client.get({
            resourcePath: "/people/~",
            queryParams: {
                projection: `(${fields})`,
            },
            accessToken,
        });

        return response.data;
    } catch (error) {
        logger.error({ error }, "Error fetching detailed LinkedIn profile");

        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("unauthorized")
            ) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (
                error.message.includes("403") ||
                error.message.includes("forbidden")
            ) {
                throw new Error(
                    "Insufficient permissions to access detailed LinkedIn profile",
                );
            }
        }

        throw new Error("Failed to fetch detailed LinkedIn profile");
    }
}

/**
 * Get user profile using OpenID Connect userinfo endpoint
 * @param accessToken - LinkedIn access token with openid scope
 * @returns OpenID Connect user info
 */
export async function getUserInfo(accessToken: string): Promise<any> {
    try {
        const client = createLinkedInClient();

        // This is for OpenID Connect standard userinfo
        const response = await client.get({
            resourcePath: "/userinfo",
            accessToken,
        });

        return response.data;
    } catch (error) {
        logger.error({ error }, "Error fetching LinkedIn userinfo");

        if (error instanceof Error) {
            if (
                error.message.includes("401") ||
                error.message.includes("unauthorized")
            ) {
                throw new Error("LinkedIn access token is invalid or expired");
            }

            if (
                error.message.includes("403") ||
                error.message.includes("forbidden")
            ) {
                throw new Error("Insufficient permissions to access userinfo");
            }
        }

        throw new Error("Failed to fetch LinkedIn userinfo");
    }
}
