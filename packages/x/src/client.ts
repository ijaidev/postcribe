import { TwitterApi } from "twitter-api-v2";

const X_CLIENT_ID = process.env.X_CLIENT_ID;
const X_CLIENT_SECRET = process.env.X_CLIENT_SECRET;
const X_CALLBACK_URL = process.env.X_CALLBACK_URL;

if (!X_CLIENT_ID || !X_CLIENT_SECRET || !X_CALLBACK_URL) {
    throw new Error("X_CLIENT_ID and X_CLIENT_SECRET are required");
}

export function createUserClient(accessToken: string): TwitterApi {
    if (!accessToken) {
        throw new Error("Access token is required for user authentication");
    }

    return new TwitterApi(accessToken);
}

/**
 * Create OAuth2 client for authentication operations
 */
function createOAuth2Client(): TwitterApi {
    return new TwitterApi({
        clientId: X_CLIENT_ID!,
        clientSecret: X_CLIENT_SECRET!,
    });
}

/**
 * Create app-only client using bearer token for read-only operations
 */

// function createAppOnlyClient(): TwitterApi {
//     return new TwitterApi(X_BEARER_TOKEN!);
// }

/**
 * Check if a token is expired or will expire soon
 * @param expiresAt - Token expiration timestamp
 * @param bufferMinutes - Minutes before expiration to consider token expired (default: 5)
 * @returns boolean indicating if token needs refresh
 */
export function isTokenExpired(
    expiresAt: Date,
    bufferMinutes: number = 5,
): boolean {
    const now = new Date();
    const expiryWithBuffer = new Date(
        expiresAt.getTime() - bufferMinutes * 60 * 1000,
    );
    return now >= expiryWithBuffer;
}

/**
 * Generate OAuth2 authorization URL using twitter-api-v2's built-in method
 * @param state - State parameter for CSRF protection
 * @returns Promise containing the auth URL, code verifier, and state
 */
export async function generateAuthURL(state: string): Promise<{
    url: string;
    codeVerifier: string;
    state: string;
}> {
    try {
        const client = createOAuth2Client();
        const {
            url,
            codeVerifier,
            state: returnedState,
        } = client.generateOAuth2AuthLink(X_CALLBACK_URL!, {
            scope: ["offline.access", "users.read"],
            state,
        });

        return {
            url,
            codeVerifier,
            state: returnedState,
        };
    } catch (error) {
        console.error("Error generating OAuth2 auth URL:", error);
        throw new Error("Failed to generate OAuth2 authorization URL");
    }
}

/**
 * Exchange authorization code for OAuth2 access tokens using twitter-api-v2's built-in method
 * @param code - Authorization code from callback
 * @param codeVerifier - Code verifier used in the initial auth request
 * @returns Promise containing the access token, refresh token, and expiration info
 */
export async function requestAccessToken(
    code: string,
    codeVerifier: string,
): Promise<{
    client: TwitterApi;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
}> {
    try {
        const client = createOAuth2Client();
        const loginResult = await client.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: X_CALLBACK_URL!,
        });

        return {
            client: loginResult.client,
            accessToken: loginResult.accessToken,
            refreshToken: loginResult.refreshToken,
            expiresIn: loginResult.expiresIn,
        };
        
    } catch (error) {
        console.error("Error exchanging code for access token:", error);
        throw new Error(
            "Failed to exchange authorization code for access token",
        );
    }
}

/**
 * Refresh an OAuth2 access token using twitter-api-v2's built-in method
 * @param refreshToken - The refresh token
 * @returns Promise containing the new access token and refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
}> {
    try {
        const client = createOAuth2Client();
        const refreshResult = await client.refreshOAuth2Token(refreshToken);

        return {
            accessToken: refreshResult.accessToken,
            expiresIn: refreshResult.expiresIn,
            refreshToken: refreshResult.refreshToken,
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);
        throw new Error("Failed to refresh access token");
    }
}
