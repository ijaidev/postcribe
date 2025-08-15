# PostCribe Cron Handler - Azure Container Apps

This Azure Container App processes messages from Azure Storage Queue to handle scheduled post operations. It runs as an event-driven job that scales based on queue length.

## Prerequisites

### 1. Install Bun (Package Manager)

```bash
curl -fsSL https://bun.sh/install | bash
```

### 2. Install Docker

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo usermod -aG docker $USER

# Or using Docker's official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### 3. Install Azure CLI

```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

### 4. Install Azure Container Apps Extension

```bash
# Install/upgrade the Azure Container Apps extension (required for all containerapp commands)
az extension add --name containerapp --upgrade
```

## Development Environment

### 1. Install Dependencies

```bash
# From repository root
bun install
```

### 2. Start Local Development Stack

```bash
# Start PostgreSQL, Redis, and Azurite
docker compose up -d

# Or individually:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:15
docker run -d -p 6379:6379 redis:7-alpine
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  --name azurite mcr.microsoft.com/azure-storage/azurite
```

### 3. Environment Configuration

Create `.env` for development:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/postcribe

# Azure Storage (local)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
AZURE_STORAGE_QUEUE_NAME=post-schedule-queue

# Other environment variables...
FRONTEND_BASE_URL=http://localhost:3001
ENVIRONMENT=development
```

### 4. Build and Test

```bash
# Build the application
bun run build:prod

# Run locally (processes queue messages once)
bun run start

# Run with file watching
bun run dev
```

## Application Details

### Architecture

- **Trigger**: Azure Storage Queue messages
- **Scaling**: Event-driven (0-10 replicas based on queue length)
- **Queue**: `post-schedule-queue`
- **Database**: PostgreSQL (via Prisma)
- **Runtime**: Node.js 20 (Container)

### Message Processing Flow

1. Receives messages from Azure Storage Queue
2. Parses JSON or base64-encoded JSON message
3. Processes cron job logic via `processCron()`
4. Deletes message after successful processing
5. Logs processing status and errors

## Deployment

### Prerequisites

- Azure CLI logged in: `az login`
- Azure Container Apps extension installed: `az extension add --name containerapp --upgrade`
- Docker access to your container registry
- Environment variables configured (see below)

### 1. Login to Container Registry

> **Note**: You can use any container registry (GitLab, Docker Hub, Azure Container Registry, GitHub Container Registry, etc.). This example uses GitLab Registry.

```bash
# GitLab Registry (example)
docker login registry.gitlab.com
# Use your GitLab username and personal access token

# Other registry examples:
# Docker Hub: docker login
# Azure Container Registry: docker login yourregistry.azurecr.io
# GitHub Container Registry: docker login ghcr.io
```

### 2. Build and Push Container Image

```bash
# From repository root, create pruned workspace
turbo prune @repo/cron-handler --out-dir out

# Build Docker image
docker build -f out/apps/cron-handler/Dockerfile -t registry.gitlab.com/postcribe/cron-handler .

# Push to registry
docker push registry.gitlab.com/postcribe/cron-handler
```

### 3. Set Environment Variables

```bash
export RESOURCE_GROUP="postcribe-cron"
export LOCATION="centralindia"
export ENVIRONMENT="postcribecron"
export JOB_NAME="cron-handler"
export STORAGE_ACCOUNT_NAME="postcribe-cron"
export QUEUE_NAME="post-schedule-queue"

export GITLAB_REGISTRY_SERVER="registry.gitlab.com"  # Or your registry URL
export GITLAB_REGISTRY_USERNAME="your-registry-username"  # Your registry username
export GITLAB_REGISTRY_PASSWORD="your-registry-access-token"  # Your registry access token/password
export CONTAINER_IMAGE="registry.gitlab.com/your-org/cron-handler:latest"  # Update with your registry and org

# Get your Azure Storage connection string from: Azure Portal → Storage Account → Access Keys
export STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=your-storage-account;AccountKey=your-access-key;EndpointSuffix=core.windows.net"
```

### 4. Create Azure Container App Job

```bash
az containerapp job create \
  --name "$JOB_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --environment "$ENVIRONMENT" \
  --trigger-type "Event" \
  --replica-timeout "1800" \
  --min-executions "0" \
  --max-executions "10" \
  --polling-interval "60" \
  --scale-rule-name "queue" \
  --scale-rule-type "azure-queue" \
  --scale-rule-metadata "accountName=$STORAGE_ACCOUNT_NAME" "queueName=$QUEUE_NAME" "queueLength=1" \
  --scale-rule-auth "connection=connection-string-secret" \
  --image "$CONTAINER_IMAGE" \
  --cpu "0.5" \
  --memory "1Gi" \
  --secrets "connection-string-secret=$STORAGE_CONNECTION_STRING" \
  --registry-server "$GITLAB_REGISTRY_SERVER" \
  --registry-username "$GITLAB_REGISTRY_USERNAME" \
  --registry-password "$GITLAB_REGISTRY_PASSWORD" \
  --env-vars "AZURE_STORAGE_CONNECTION_STRING=secretref:connection-string-secret"
```

### 5. Update Environment Variables

> **Important**: Replace all placeholder values below with your actual configuration values from your `.env.prod` file

```bash
# Create YAML configuration with all environment variables
# Copy the values from your apps/cron-handler/.env.prod file and replace the placeholders below
cat > temp_env.yaml << 'EOF'
properties:
  template:
    containers:
    - name: cron-handler
      image: registry.gitlab.com/your-org/cron-handler:latest  # Update with your container image
      env:
      - name: DATABASE_URL
        value: "your-postgresql-connection-string"  # Get from Neon, Supabase, etc.
      - name: FRONTEND_BASE_URL
        value: "https://your-domain.com"  # Your frontend URL
      - name: TAVILY_API_KEY
        value: "your-tavily-api-key"  # Get from https://tavily.com/
      - name: LANGSMITH_TRACING
        value: "true"
      - name: LANGSMITH_ENDPOINT
        value: https://api.smith.langchain.com
      - name: LANGSMITH_API_KEY
        value: "your-langsmith-api-key"  # Get from https://smith.langchain.com/
      - name: LANGSMITH_PROJECT
        value: "your-langsmith-project-name"
      - name: R2_API_URL
        value: "your-r2-api-url"  # Cloudflare Dashboard → R2 → Your Bucket
      - name: R2_ACCESS_KEY_ID
        value: "your-r2-access-key"  # R2 → Manage R2 API Tokens
      - name: R2_SECRET_ACCESS_KEY
        value: "your-r2-secret-key"
      - name: R2_BUCKET_NAME
        value: "your-r2-bucket-name"
      - name: R2_PUBLIC_URL
        value: "your-r2-public-url"  # Public URL for your R2 bucket
      - name: AI_DB_URL
        value: "your-ai-database-url"  # Separate AI database if used
      - name: ENVIRONMENT
        value: production
      - name: REDIS_URL
        value: "your-redis-connection-string"  # Upstash, Redis Cloud, etc.
      - name: AZURE_OPENAI_ENDPOINT
        value: "your-azure-openai-endpoint"  # Azure Portal → AI Services
      - name: AZURE_OPENAI_API_KEY
        value: "your-azure-openai-api-key"  # Keys and Endpoint section
      - name: AZURE_OPENAI_ENDPOINT_IMAGE
        value: "your-azure-openai-image-endpoint"  # For DALL-E
      - name: AZURE_OPENAI_API_KEY_IMAGE
        value: "your-azure-openai-image-api-key"
      - name: SMTP_HOST
        value: "your-smtp-host"  # e.g., smtp-relay.brevo.com
      - name: SMTP_PORT
        value: "587"
      - name: SMTP_USER
        value: "your-smtp-username"
      - name: SMTP_PASS
        value: "your-smtp-password"
      - name: X_RAPID_API_KEY
        value: "your-x-rapid-api-key"  # Get from RapidAPI
      - name: AZURE_STORAGE_CONNECTION_STRING
        secretRef: connection-string-secret
EOF

# Apply the configuration
az containerapp job update \
  --name "cron-handler" \
  --resource-group "postcribe-cron" \
  --yaml temp_env.yaml

# Clean up temporary file
rm temp_env.yaml
```

> **⚠️ Security Note**: The YAML template above contains placeholder values. You MUST replace ALL placeholder values with your actual configuration from your `.env.prod` file before running the command. Never commit real credentials to version control.

### 6. Update Environment Variables from .env.prod (Alternative)

```bash
# For future updates, use this streamlined approach:
# Make sure to update your apps/cron-handler/.env.prod file first with your actual values
az containerapp job update \
  --name "cron-handler" \
  --resource-group "postcribe-cron" \
  --replace-env-vars "$(grep -v '^#' apps/cron-handler/.env.prod | grep -v '^$' | tr '\n' ' ')" \
  AZURE_STORAGE_CONNECTION_STRING=secretref:connection-string-secret
```

### 7. Update Container Image (For Code Changes)

When you push a new image with the same tag (e.g., `:latest`), you need to force the Container App Job to pull the updated image:

```bash
# After building and pushing your updated image:
docker build -f out/apps/cron-handler/Dockerfile -t registry.gitlab.com/postcribe/cron-handler:latest .
docker push registry.gitlab.com/postcribe/cron-handler:latest

# replace postcribe with your project or org

# Force Container App Job to pull the updated image
az containerapp job update \
  --name "cron-handler" \
  --resource-group "postcribe-cron" \
  --image "registry.gitlab.com/postcribe/cron-handler:latest"
```

> **Note**: For production deployments, consider using specific version tags (e.g., `v1.0.1`, `build-123`) instead of `:latest` to ensure reproducible deployments and avoid confusion about which version is deployed.

#### Where to Get Your Configuration Values:

| Service                 | Where to Get Values                                            | Configuration Example                 |
| ----------------------- | -------------------------------------------------------------- | ------------------------------------- |
| **PostgreSQL Database** | Neon, Supabase, or your provider                               | `postgresql://user:pass@host:port/db` |
| **Tavily API**          | https://tavily.com/ → API Keys                                 | Web search API for AI features        |
| **LangSmith**           | https://smith.langchain.com/ → Settings → API Keys             | LLM observability and tracing         |
| **Azure OpenAI**        | Azure Portal → AI Services → Your Resource → Keys and Endpoint | Text/image generation APIs            |
| **Cloudflare R2**       | Cloudflare Dashboard → R2 → Manage R2 API Tokens               | File storage service                  |
| **Redis**               | Upstash, Redis Cloud, or your provider                         | Cache service connection string       |
| **SMTP Email**          | Brevo, SendGrid, or your email provider                        | Email sending configuration           |
| **RapidAPI**            | https://rapidapi.com/ → Your Apps → Security                   | For X/Twitter API access              |

## Monitoring and Troubleshooting

### View Logs

```bash
# Azure CLI
az containerapp job show --name "cron-handler" --resource-group "postcribe-cron"

# View execution history
az containerapp job execution list --name "cron-handler" --resource-group "postcribe-cron"
```

### Common Issues

1. **Container fails to start**

    - Check environment variables are set correctly
    - Verify database connectivity
    - Check container image exists in registry

2. **No queue processing**

    - Verify Azure Storage Queue has messages
    - Check queue scaling rule configuration
    - Ensure `AZURE_STORAGE_CONNECTION_STRING` secret is valid

3. **Database connection errors**
    - Verify `DATABASE_URL` format and credentials
    - Check network connectivity to database
    - Ensure Prisma client is generated correctly

### Manual Testing

```bash
# Add a test message to the queue (using Azure Portal or Azure CLI)
# Replace $STORAGE_CONNECTION_STRING with your actual Azure Storage connection string
az storage message put \
  --queue-name "post-schedule-queue" \
  --content '{"type":"test","data":"test message"}' \
  --connection-string "$STORAGE_CONNECTION_STRING"

# Or use Azure Portal:
# 1. Go to Azure Portal → Storage Account → Queues
# 2. Click on "post-schedule-queue"
# 3. Click "Add message"
# 4. Add test JSON: {"type":"test","data":"test message"}
```

## Project Structure

```
apps/cron-handler/
├── src/
│   ├── index.ts          # Queue message handler
│   ├── main.ts           # Core processing logic
│   └── types.ts          # Type definitions
├── Dockerfile            # Container configuration
├── .env.prod            # Production environment variables
├── package.json         # Dependencies and scripts
└── README.md            # This file
```
