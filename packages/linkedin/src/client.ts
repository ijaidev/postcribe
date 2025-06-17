import { AuthClient, RestliClient } from "linkedin-api-client";
import { logger } from "@repo/logger";

export interface LinkedInAuthResult {
    authUrl: string;
    state: string;
}

export interface LinkedInTokenResult {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scope: string;
}

export interface LinkedInRefreshResult {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
}

/**
 * Create a LinkedIn AuthClient instance
 * @returns Configured AuthClient
 */
function createAuthClient(): AuthClient {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUrl = process.env.LINKEDIN_CALLBACK_URL;

    if (!clientId || !clientSecret) {
        throw new Error(
            "LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are required",
        );
    }

    return new AuthClient({
        clientId,
        clientSecret,
        redirectUrl,
    });
}

const authClient = createAuthClient();

/**
 * Generate LinkedIn OAuth2 authorization URL
 * @param state - Random state string for CSRF protection
 * @param scopes - Array of LinkedIn scopes (default: profile permissions)
 * @returns Authorization URL and state
 */
export function generateAuthURL(
    state: string,
    scopes: string[] = ["openid", "profile", "email", "w_member_social"],
): LinkedInAuthResult {
    const authUrl = authClient.generateMemberAuthorizationUrl(scopes, state);

    return {
        authUrl,
        state,
    };
}

/**
 * Exchange authorization code for access token
 * @param code - Authorization code from LinkedIn callback
 * @returns Token details
 */
export async function requestAccessToken(
    code: string,
): Promise<LinkedInTokenResult> {
    try {
        const tokenData = await authClient.exchangeAuthCodeForAccessToken(code);

        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
            scope: tokenData.scope,
        };
    } catch (error) {
        logger.error({ error }, "LinkedIn token exchange error");
        throw new Error(
            "Failed to exchange authorization code for access token",
        );
    }
}

/**
 * Refresh an expired access token
 * @param refreshToken - Refresh token
 * @returns New token details
 */
export async function refreshAccessToken(
    refreshToken: string,
): Promise<LinkedInRefreshResult> {
    try {
        const tokenData =
            await authClient.exchangeRefreshTokenForAccessToken(refreshToken);

        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
        };
    } catch (error) {
        logger.error({ error }, "LinkedIn token refresh error");
        throw new Error("Failed to refresh LinkedIn access token");
    }
}

/**
 * Check if a token is expired
 * @param expiresAt - Token expiration date
 * @param bufferMinutes - Minutes buffer before expiration (default: 5)
 * @returns True if token is expired or will expire within buffer time
 */
export function isTokenExpired(
    expiresAt: Date,
    bufferMinutes: number = 5,
): boolean {
    const now = new Date();
    const bufferMs = bufferMinutes * 60 * 1000;
    return now.getTime() >= expiresAt.getTime() - bufferMs;
}

/**
 * Create a LinkedIn RestliClient instance
 * @param accessToken - LinkedIn access token (optional, can be provided in method calls)
 * @returns Configured RestliClient
 */
export function createLinkedInClient(accessToken?: string): RestliClient {
    // According to docs, RestliClient can be created with optional config
    // Access token is provided per request, not in constructor
    return new RestliClient();
}

/**
 * Introspect a LinkedIn access token to get details
 * @param accessToken - Access token to introspect
 * @returns Token introspection details
 */

export async function introspectAccessToken(accessToken: string) {
    try {
        return await authClient.introspectAccessToken(accessToken);
    } catch (error) {
        logger.error({ error }, "LinkedIn token introspection error");
        throw new Error("Failed to introspect LinkedIn access token");
    }
}
