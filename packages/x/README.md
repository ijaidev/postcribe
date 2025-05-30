# X (Twitter) Package

A TypeScript package for interacting with the X (Twitter) API, providing functions for media upload and tweet posting.

## Features

- 📷 **Media Upload**: Upload images and videos to X
- 🐦 **Tweet Posting**: Create tweets with text, media, polls, and replies
- 🔒 **OAuth2 Authentication**: Secure user authentication using OAuth2
- 📝 **TypeScript Support**: Fully typed interfaces and functions

## Setup

### Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Twitter API Credentials
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_BEARER_TOKEN=your_bearer_token
TWITTER_CALLBACK_URL=your_callback_url
```

### Installation

```bash
bun install
```

## Usage

### Import Functions

```typescript
import { uploadMedia, postTweet, getUserProfile, createUserClient } from "@repo/x";
```

### Authentication

All posting and media upload operations require user authentication tokens. These are obtained through the OAuth2 flow handled by the controllers.

### Upload Media

Upload an image or video to X:

```typescript
import { uploadMedia } from "@repo/x";

async function uploadImage(accessToken: string, accessSecret: string) {
  try {
    const result = await uploadMedia(
      "/path/to/image.jpg", 
      accessToken, 
      accessSecret, 
      "Alt text for accessibility"
    );
    console.log("Media uploaded:", result);
    return result.media_id_string;
  } catch (error) {
    console.error("Upload failed:", error);
  }
}
```

### Post a Tweet

#### Text-only Tweet

```typescript
import { postTweet } from "@repo/x";

async function postTextTweet(accessToken: string, accessSecret: string) {
  try {
    const result = await postTweet("Hello, X! 🚀", accessToken, accessSecret);
    console.log("Tweet posted:", result);
  } catch (error) {
    console.error("Tweet failed:", error);
  }
}
```

#### Tweet with Media

```typescript
async function postTweetWithMedia(accessToken: string, accessSecret: string) {
  try {
    // First upload media
    const mediaResult = await uploadMedia(
      "/path/to/image.jpg", 
      accessToken, 
      accessSecret, 
      "Image description"
    );
    
    // Then post tweet with media
    const tweetResult = await postTweet("Check out this image!", accessToken, accessSecret, {
      media_ids: [mediaResult.media_id_string],
    });
    
    console.log("Tweet with media posted:", tweetResult);
  } catch (error) {
    console.error("Failed:", error);
  }
}
```

#### Tweet with Poll

```typescript
async function postPollTweet(accessToken: string, accessSecret: string) {
  try {
    const result = await postTweet("What's your favorite programming language?", accessToken, accessSecret, {
      poll: {
        options: ["JavaScript", "TypeScript", "Python", "Rust"],
        duration_minutes: 1440, // 24 hours
      },
    });
    console.log("Poll tweet posted:", result);
  } catch (error) {
    console.error("Poll tweet failed:", error);
  }
}
```

#### Reply to a Tweet

```typescript
async function replyToTweet(originalTweetId: string, accessToken: string, accessSecret: string) {
  try {
    const result = await postTweet("Great point!", accessToken, accessSecret, {
      reply: {
        in_reply_to_tweet_id: originalTweetId,
      },
    });
    console.log("Reply posted:", result);
  } catch (error) {
    console.error("Reply failed:", error);
  }
}
```

### Get User Profile

```typescript
import { getUserProfile } from "@repo/x";

async function getProfile(accessToken: string, accessSecret: string) {
  try {
    const profile = await getUserProfile(accessToken, accessSecret);
    console.log("User profile:", profile);
  } catch (error) {
    console.error("Failed to get profile:", error);
  }
}
```

### Create Custom Client

```typescript
import { createUserClient } from "@repo/x";

function createCustomClient(accessToken: string, accessSecret: string) {
  const userClient = createUserClient(accessToken, accessSecret);
  // Use userClient for custom API calls
  return userClient;
}
```

## API Reference

### `uploadMedia(filePath: string, accessToken: string, accessSecret: string, altText?: string): Promise<MediaUploadResult>`

Uploads media to X.

**Parameters:**
- `filePath` (string): Absolute path to the media file
- `accessToken` (string): User's OAuth access token
- `accessSecret` (string): User's OAuth access secret
- `altText` (string, optional): Alt text for accessibility

**Returns:** Promise with media upload result containing `media_id_string`

### `postTweet(text: string, accessToken: string, accessSecret: string, options?: TweetOptions): Promise<TweetResult>`

Posts a tweet to X.

**Parameters:**
- `text` (string): Tweet text content (max 280 characters)
- `accessToken` (string): User's OAuth access token
- `accessSecret` (string): User's OAuth access secret
- `options` (object, optional): Tweet options

**Options:**
- `media_ids` (string[]): Array of media IDs to attach
- `poll` (object): Poll configuration with options and duration
- `reply` (object): Reply configuration with tweet ID
- `quote_tweet_id` (string): ID of tweet to quote

### `getUserProfile(accessToken: string, accessSecret: string): Promise<UserProfile>`

Gets user's Twitter profile information.

**Parameters:**
- `accessToken` (string): User's OAuth access token
- `accessSecret` (string): User's OAuth access secret

**Returns:** Promise with user profile data

### `createUserClient(accessToken: string, accessSecret: string): TwitterApi`

Creates an authenticated TwitterApi client for a specific user.

**Parameters:**
- `accessToken` (string): User's OAuth access token
- `accessSecret` (string): User's OAuth access secret

**Returns:** TwitterApi client instance

## Authentication Flow

The package includes OAuth2 authentication controllers for handling user login:

1. **Login Initiation**: `/x/login` - Generates authorization URL
2. **Callback Handling**: `/x/callback` - Exchanges code for tokens

The controllers handle PKCE (Proof Key for Code Exchange) for secure authentication.

## Error Handling

All functions throw errors that should be caught and handled:

```typescript
try {
  await postTweet("Hello!", accessToken, accessSecret);
} catch (error) {
  if (error.message.includes("character limit")) {
    console.error("Tweet too long");
  } else if (error.message.includes("authentication")) {
    console.error("Check your API credentials");
  } else {
    console.error("Unexpected error:", error);
  }
}
```

## Rate Limits

Be aware of X's rate limits:
- Tweet posting: 300 tweets per 15-minute window
- Media upload: varies by file size and type

Implement appropriate retry logic and rate limiting in your application.

## Dependencies

- `twitter-api-v2`: Full-featured Twitter API v2 client with OAuth support

## Migration from twitter-api-sdk

This package has been migrated from `twitter-api-sdk` to `twitter-api-v2` for better OAuth2 support and more comprehensive API coverage.
