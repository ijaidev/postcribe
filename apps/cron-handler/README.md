# PostCribe Cron Handler

AWS Lambda function that processes scheduled post generation requests from SQS queue.

## Features

- Processes SQS messages containing cron post requests
- Generates posts using AI based on user requirements
- Handles auto-approval for immediate publishing
- Sends email notifications for manual approval with review links
- Integrates with existing PostCribe database and AI systems

## Environment Variables

Required environment variables for deployment:

```bash
# Database
DATABASE_URL=postgresql://...

# SQS Configuration
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue-name
SQS_QUEUE_ARN=arn:aws:sqs:region:account:queue-name

# Frontend URLs
FRONTEND_BASE_URL=https://your-frontend-domain.com
BASE_URL=https://your-api-domain.com

# Email Configuration
FROM_EMAIL=noreply@postcribe.com
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# AI Configuration
OPENAI_API_KEY=sk-...
AI_DB_URL=your-ai-db-url
TAVILY_API_KEY=your-tavily-key
```

## Deployment

### Prerequisites

1. Install dependencies:
```bash
bun install
```

2. Install Serverless Framework globally:
```bash
npm install -g serverless
```

3. Configure AWS credentials:
```bash
aws configure
```

### Deploy to AWS

1. Development environment:
```bash
bun run deploy:dev
```

2. Production environment:
```bash
bun run deploy:prod
```

3. Custom stage:
```bash
serverless deploy --stage your-stage
```

## How it Works

1. **SQS Trigger**: Lambda function is triggered by messages in the SQS queue
2. **Message Processing**: Each message contains `{id: string, userId: string}` for a PostCron
3. **Post Generation**: Uses AI to generate posts based on the cron configuration
4. **Auto-Approval**: If enabled, publishes posts immediately
5. **Manual Approval**: Sends email with review link to `{baseUrl}/post/draft/{draftId}`
6. **Cleanup**: Deactivates processed cron jobs and deletes SQS messages

## Message Format

SQS messages should contain:
```json
{
  "id": "post-cron-uuid",
  "userId": "user-uuid"
}
```

## Lambda Configuration

- **Runtime**: Node.js 20.x
- **Timeout**: 15 minutes
- **Memory**: 1024 MB
- **Batch Size**: 10 messages
- **Visibility Timeout**: 5 minutes

## Monitoring

The function logs all operations using the `@repo/logger` package. Monitor CloudWatch logs for:

- Message processing status
- Post generation success/failure
- Email sending status
- Error handling and retries

## Error Handling

- Failed messages remain in SQS for retry
- Individual message failures don't affect batch processing
- Comprehensive error logging for debugging
- Graceful handling of missing or invalid data
