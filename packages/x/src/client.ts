import { TwitterApi } from "twitter-api-v2";

export function createUserClient(accessToken: string): TwitterApi {
    if (!accessToken) {
        throw new Error("Access token is required for user authentication");
    }

    return new TwitterApi(accessToken);
}

/**
 * Create a user-authenticated client with OAuth 1.0a credentials (for media uploads)
 * @param accessToken - User's OAuth access token
 * @param accessSecret - User's OAuth access secret
 */
export function createUserV1Client(
    accessToken: string,
    accessSecret: string,
): TwitterApi {
    if (!process.env.TWITTER_API_KEY || !process.env.TWITTER_API_SECRET) {
        throw new Error("TWITTER_API_KEY and TWITTER_API_SECRET are required");
    }

    if (!accessToken || !accessSecret) {
        throw new Error(
            "Both access token and access secret are required for OAuth 1.0a",
        );
    }

    return new TwitterApi({
        appKey: process.env.TWITTER_API_KEY,
        appSecret: process.env.TWITTER_API_SECRET,
        accessToken,
        accessSecret,
    });
}

/**
 * Create OAuth2 client for authentication operations
 */
function createOAuth2Client(): TwitterApi {
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
        throw new Error(
            "TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are required",
        );
    }

    return new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });
}

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
    if (!process.env.TWITTER_CALLBACK_URL) {
        throw new Error("TWITTER_CALLBACK_URL is required");
    }

    try {
        const client = createOAuth2Client();
        const {
            url,
            codeVerifier,
            state: returnedState,
        } = client.generateOAuth2AuthLink(process.env.TWITTER_CALLBACK_URL, {
            scope: [
                "tweet.read",
                "tweet.write",
                "users.read",
                "offline.access",
            ],
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
    if (!process.env.TWITTER_CALLBACK_URL) {
        throw new Error("TWITTER_CALLBACK_URL is required");
    }

    try {
        const client = createOAuth2Client();
        const loginResult = await client.loginWithOAuth2({
            code,
            codeVerifier,
            redirectUri: process.env.TWITTER_CALLBACK_URL,
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

