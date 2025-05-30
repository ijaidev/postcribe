# @repo/x

A functional Twitter/X API client package built on top of `twitter-api-v2` with OAuth2 authentication support.

## Features

- **OAuth2 Authentication**: Full OAuth2 flow implementation using Twitter API v2
- **Functional Programming**: Pure functions, no classes
- **Built-in Token Management**: Automatic token refresh capabilities
- **Media Upload**: Support for uploading images and videos
- **Tweet Operations**: Post tweets, get user details, fetch timelines
- **Type Safety**: Full TypeScript support

## Environment Variables

```bash
# Required for OAuth2 authentication
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_CALLBACK_URL=your_callback_url

# Required for app-only authentication
TWITTER_BEARER_TOKEN=your_bearer_token

# Optional: Required only for OAuth 1.0a operations (legacy)
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
```

## Usage

### OAuth2 Authentication Flow

#### 1. Generate Authorization URL

```typescript
import { generateAuthURL } from "@repo/x";

const state = "unique-state-string";
const authData = await generateAuthURL(state);

// Store authData.codeVerifier securely for the callback
console.log("Redirect user to:", authData.url);
```

#### 2. Handle OAuth Callback

```typescript
import { requestAccessToken } from "@repo/x";

const { code, state } = callbackParams;
const codeVerifier = "stored-code-verifier-from-step-1";

const tokenResult = await requestAccessToken(code, codeVerifier);

// Store these tokens securely
const {
  accessToken,
  refreshToken,
  expiresIn
} = tokenResult;
```

#### 3. Refresh Expired Tokens

```typescript
import { refreshAccessToken, isTokenExpired } from "@repo/x";

// Check if token needs refresh
if (isTokenExpired(expiresAt)) {
  const refreshResult = await refreshAccessToken(refreshToken);
  
  // Update stored tokens
  const newAccessToken = refreshResult.accessToken;
  const newRefreshToken = refreshResult.refreshToken;
}
```

### Client Creation

#### User-Authenticated Client (OAuth2)
```typescript
import { createUserClient } from "@repo/x";

const client = createUserClient(accessToken);
```

#### App-Only Client (Read-only)
```typescript
import { createAppClient } from "@repo/x";

// Create app client
const appClient = createAppClient();
const tweets = await appClient.v2.search("JavaScript");
```

### Function Examples

#### Get Valid Access Token (with Auto-Refresh)
```typescript
import { getValidAccessToken, getValidAccessTokenById } from "@repo/x";

// Get token by user ID (uses most recent X login)
const tokenResult = await getValidAccessToken(userId);

// Get token by specific social login ID
const tokenResult = await getValidAccessTokenById(socialLoginId);

// The function automatically refreshes if expired
console.log(tokenResult.accessToken); // Always valid
console.log(tokenResult.isRefreshed); // true if token was refreshed
```

#### Get User Details
```typescript
import { getUserDetails, getValidAccessToken } from "@repo/x";

const tokenResult = await getValidAccessToken(userId);
const userInfo = await getUserDetails(tokenResult.accessToken);
console.log(userInfo.username, userInfo.followers_count);
```

#### Post a Tweet
```typescript
import { postTweet, getValidAccessToken } from "@repo/x";

const tokenResult = await getValidAccessToken(userId);
const result = await postTweet(
  "Hello Twitter!",
  tokenResult.accessToken,
  {
    // Optional: reply to another tweet
    reply: { in_reply_to_tweet_id: "123456" },
    
    // Optional: attach media
    media: { media_ids: ["media_id_1"] },
    
    // Optional: add a poll
    poll: {
      options: ["Option 1", "Option 2"],
      duration_minutes: 1440
    }
  }
);
```

#### Upload Media
```typescript
import { uploadMedia, getValidAccessToken } from "@repo/x";

const tokenResult = await getValidAccessToken(userId);
const mediaResult = await uploadMedia(
  "/path/to/image.jpg",
  tokenResult.accessToken,
  "Alt text for accessibility"
);

// Use the media ID in a tweet
await postTweet("Check out this image!", tokenResult.accessToken, {
  media: { media_ids: [mediaResult.media_id] }
});
```

#### Get Current User's Tweets
```typescript
import { getUserTweets, getValidAccessToken } from "@repo/x";

const tokenResult = await getValidAccessToken(userId);
const tweets = await getUserTweets(tokenResult.accessToken);
tweets.forEach(tweet => console.log(tweet.text));
```

## Token Management

### Automatic Token Refresh

The `getValidAccessToken` functions automatically handle token expiration:

```typescript
import { getValidAccessToken } from "@repo/x";

// This function will:
// 1. Check if access token is expired (with 5-minute buffer)
// 2. If expired, automatically refresh using refresh token
// 3. Update database with new tokens
// 4. Return valid access token

const tokenResult = await getValidAccessToken(userId);

if (tokenResult.isRefreshed) {
  console.log("Token was automatically refreshed");
}

// Use the always-valid access token
const client = createUserClient(tokenResult.accessToken);
```

### Manual Token Management

```typescript
import { refreshAccessToken, isTokenExpired } from "@repo/x";

// Check if token needs refresh
if (isTokenExpired(expiresAt, 10)) { // 10-minute buffer
  const refreshResult = await refreshAccessToken(refreshToken);
  
  // Update your storage
  await updateTokensInDatabase({
    accessToken: refreshResult.accessToken,
    refreshToken: refreshResult.refreshToken,
    expiresAt: new Date(Date.now() + 7200000) // 2 hours
  });
}
```

## OAuth2 Scopes

The package requests the following scopes by default:
- `tweet.read` - Read tweets
- `tweet.write` - Post tweets  
- `users.read` - Read user profiles
- `offline.access` - Refresh tokens

## Error Handling

All functions throw descriptive errors. Wrap calls in try-catch blocks:

```typescript
try {
  const tokenResult = await getValidAccessToken(userId);
  const result = await postTweet("Hello!", tokenResult.accessToken);
} catch (error) {
  if (error.message.includes("not connected")) {
    // User needs to authenticate with X
    console.error("Please connect your X account first");
  } else if (error.message.includes("refresh")) {
    // Token refresh failed, re-authentication needed
    console.error("Please re-authenticate with X");
  } else {
    // Handle other API errors
    console.error("API Error:", error.message);
  }
}
```

## Database Integration

When storing OAuth2 data, consider this structure:

```sql
CREATE TABLE social_login (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  provider VARCHAR(20) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP NOT NULL,
  state VARCHAR(255), -- For OAuth flow
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Migration from v1.0a

If you were using OAuth 1.0a before:

1. Update environment variables to use `TWITTER_CLIENT_ID/SECRET`
2. Replace class-based `xAuthClient` with functional calls
3. Update token storage to handle OAuth2 tokens
4. Use `createUserClient()` instead of v1 clients for most operations

## Contributing

This package follows functional programming principles. When adding new features:
- Use pure functions
- Avoid classes and mutable state
- Include proper TypeScript types
- Add error handling
- Update this README

## Dependencies

- `twitter-api-v2` - Official Twitter API v2 client
- Built for Bun runtime and TypeScript
