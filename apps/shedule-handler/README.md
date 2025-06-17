# PostCribe Schedule Handler

AWS Lambda function that processes scheduled drafts by publishing posts to social media platforms (X/Twitter and LinkedIn).

## Overview

This Lambda function is triggered by schedule events containing a draft ID. It:

1. Fetches the draft with posts and user's social login details
2. Validates the draft can be published
3. Publishes each post to the appropriate platform (X or LinkedIn)
4. Marks posts and drafts as published
5. Updates the draft schedule status

## Event Structure

The Lambda expects events with this structure:

```typescript
interface ScheduleEvent {
    draftId: string;
}
```

## Process Flow

```
Schedule Event (draftId)
    ↓
Fetch Draft with Posts & User Social Logins
    ↓
Validate Draft (not published, has posts, user has social accounts)
    ↓
For each unpublished post:
    ↓
Publish to Platform (X/Twitter or LinkedIn)
    ↓
Mark Post as Published
    ↓
Mark Draft as Published (if all posts published)
    ↓
Mark Schedule as Published
```

## Database Integration

Interacts with these database models:

- `Draft` - Contains posts and schedule info
- `Post` - Individual posts with platform type
- `DraftSchedule` - Scheduling metadata
- `SocialLogin` - User's platform access tokens
- `User` - User data and relationships

## Platform Publishing

### X/Twitter

- Uses `@repo/x` package
- Calls `postTweet()` with user's access token
- Supports media attachments via `media_ids`
- Handles token validation and refresh

### LinkedIn

- Uses `@repo/linkedin` package
- Calls `createPost()` with user's access token
- Supports media attachments
- Uses public visibility by default

## Error Handling

- Validates draft exists and is not already published
- Checks user has connected social accounts for target platforms
- Continues publishing other posts if one fails
- Logs detailed error information for debugging
- Updates database state appropriately on success/failure

## Environment Variables

Inherits from workspace packages:

- Database connection via `@repo/db`
- Platform API credentials via `@repo/x` and `@repo/linkedin`

## Deployment

This is designed to be deployed as an AWS Lambda function with appropriate triggers (EventBridge, SQS, etc.) that provide the draft ID at scheduled times.
