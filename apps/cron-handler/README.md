# PostCribe Cron Handler

AWS Lambda function that processes scheduled post generation requests from SQS queue with comprehensive retry handling, idempotency, and state resumption capabilities.

## Features

- **Stage-based Processing**: Breaks down processing into discrete stages for better error isolation and resumption
- **Retry Strategy**: Multi-level retry with exponential backoff and dead letter queue handling
- **Idempotency**: Ensures messages can be processed multiple times safely
- **State Resumption**: Can resume processing from the last completed stage after failures
- **Partial Batch Failures**: Uses SQS's `ReportBatchItemFailures` for granular error handling
- **Dead Letter Queue Management**: Automated DLQ monitoring and redrive capabilities

## Processing Stages

The function processes each cron message through the following stages:

1. **DRAFT_CREATION**: Create draft and fetch PostCron data
2. **AI_GENERATION**: Generate post content using AI
3. **MEDIA_UPLOAD**: Upload media files to social platforms
4. **POST_CREATION**: Create post records in database
5. **PLATFORM_PUBLISHING**: Publish to social platforms (auto-approval)
6. **EMAIL_NOTIFICATION**: Send approval email (manual approval)
7. **COMPLETED**: Processing finished

Each stage is idempotent and can be safely retried. The function tracks state to resume from the last completed stage.

## Retry Strategy

### Level 1: Function-Level Retries
- **Within-function retries**: Individual operations retry with exponential backoff
- **Stage resumption**: Failed stages are retried from the exact point of failure
- **State persistence**: Processing state is maintained for idempotency

### Level 2: SQS-Level Retries
- **Partial batch failures**: Failed messages are returned to SQS for retry
- **Visibility timeout**: 16 minutes (function timeout + buffer)
- **Max receive count**: 3 attempts before moving to DLQ

### Level 3: Dead Letter Queue Handling
- **DLQ monitoring**: Automated monitoring every 30 minutes
- **Redrive capability**: Periodic redrive from DLQ to main queue (every 2 hours)
- **Manual intervention**: DLQ processor for monitoring and alerts

## Environment Variables

Required environment variables for deployment:

```bash
# Database
DATABASE_URL=postgresql://...

# SQS Configuration
SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account/queue-name
SQS_QUEUE_ARN=arn:aws:sqs:region:account:queue-name
SQS_DLQ_URL=https://sqs.region.amazonaws.com/account/dlq-name
SQS_DLQ_ARN=arn:aws:sqs:region:account:dlq-name

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

## Infrastructure Components

### Main Queue (`CronProcessingQueue`)
- **Visibility Timeout**: 960 seconds (16 minutes)
- **Message Retention**: 14 days
- **Encryption**: SQS-managed KMS
- **Redrive Policy**: Max 3 receives before DLQ

### Dead Letter Queue (`CronProcessingDLQ`)
- **Retention**: 14 days
- **Monitoring**: Automated every 30 minutes
- **Redrive**: Automated every 2 hours

### Processing State Table (`ProcessingStateTable`)
- **Purpose**: Track processing state for idempotency
- **TTL**: Automatic cleanup of old states
- **Global Index**: Query by update time for monitoring

## Lambda Functions

### 1. `cronHandler` (Main Processor)
- **Timeout**: 15 minutes
- **Memory**: 1024 MB
- **Concurrency**: Limited to 10 concurrent executions
- **Trigger**: SQS messages (batch size: 1)
- **Features**: ReportBatchItemFailures enabled

### 2. `dlqProcessor` (DLQ Monitor)
- **Timeout**: 5 minutes
- **Memory**: 512 MB
- **Schedule**: Every 30 minutes
- **Purpose**: Monitor DLQ, send alerts, update metrics

### 3. `redrive` (DLQ Redrive)
- **Timeout**: 5 minutes
- **Memory**: 256 MB
- **Schedule**: Every 2 hours
- **Purpose**: Move messages from DLQ back to main queue

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

## How Retry Handling Works

### Idempotency
Each processing stage checks existing state before proceeding:
- **Draft Creation**: Checks if draft already exists
- **AI Generation**: Verifies if content was already generated
- **Media Upload**: Validates existing media uploads
- **Platform Publishing**: Ensures posts aren't double-published

### State Resumption
When a retry occurs:
1. Function loads existing processing state
2. Determines the last completed stage
3. Resumes processing from the next stage
4. Updates state after each successful stage

### Error Handling
```typescript
// Stage-based error handling
try {
    await processStage(currentStage, state);
    await updateState(nextStage);
} catch (error) {
    await updateState(currentStage, { error, attempts: attempts + 1 });
    throw error; // Triggers SQS retry
}
```

### Message Flow

```
Producer → SQS Queue → Lambda (Stage 1-7) → Success
                                   ↓ (on failure)
                            SQS Retry (up to 3x)
                                   ↓ (if still failing)
                              Dead Letter Queue
                                   ↓ (monitored)
                            DLQ Processor (alerts)
                                   ↓ (redrive)
                              Back to Main Queue
```

## Monitoring

### CloudWatch Metrics
- Function duration and errors
- SQS queue depth and age
- DLQ message count
- Processing stage success/failure rates

### Alarms
- DLQ messages > 0
- Function error rate > 5%
- Processing duration > 10 minutes
- Queue age > 30 minutes

### Logs
- Structured logging with stage information
- Error details with context
- Processing state transitions
- Retry attempt tracking

## Best Practices

### For Idempotency
1. Check existing state before each operation
2. Use unique identifiers for resources
3. Make operations safely repeatable
4. Store intermediate results

### For Retry Handling
1. Keep stages granular and focused
2. Persist state after each successful stage
3. Use exponential backoff for external calls
4. Distinguish between retryable and non-retryable errors

### For Monitoring
1. Set up CloudWatch alarms for all metrics
2. Monitor DLQ regularly for poison messages
3. Track processing success rates by stage
4. Log comprehensive context for failures

## Troubleshooting

### Common Issues

**Messages stuck in DLQ**
- Check DLQ processor logs
- Verify redrive configuration
- Manually inspect failed messages

**Repeated failures on specific stage**
- Check stage-specific logs
- Verify external service availability
- Review processing state data

**Performance degradation**
- Monitor concurrent executions
- Check database connection pooling
- Review memory and timeout settings

### Manual Intervention

**Redrive specific messages**
```bash
aws sqs start-message-move-task \
  --source-arn arn:aws:sqs:region:account:dlq-name \
  --destination-arn arn:aws:sqs:region:account:queue-name
```

**Check processing state**
```bash
aws dynamodb get-item \
  --table-name processing-state-table \
  --key '{"compositeKey":{"S":"cronId#userId"}}'
```

## Security

- **Encryption**: All queues use SQS-managed KMS encryption
- **IAM Roles**: Least privilege access for each function
- **VPC**: Optional VPC configuration for database access
- **Secrets**: Environment variables for sensitive data

## Cost Optimization

- **Reserved Concurrency**: Limits Lambda costs
- **Batch Size**: Single message processing for better isolation
- **TTL**: Automatic cleanup of old processing state
- **Memory**: Right-sized for each function's requirements
