# PostCribe Cron Sender - Azure Function

This Azure Function runs on a schedule to process cron jobs and send messages to Azure Storage Queue.

## Prerequisites

### 1. Install Node.js (v18+)

```bash
# Using curl (recommended)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Or using nvm (alternative)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 2. Install Azure Functions Core Tools

```bash
# Using curl (recommended)
curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
sudo mv microsoft.gpg /etc/apt/trusted.gpg.d/microsoft.gpg
sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
sudo apt-get update
sudo apt-get install azure-functions-core-tools-4

# Or using npm (alternative)
npm install -g azure-functions-core-tools@4 --unsafe-perm true
```

### 3. Install Bun (Package Manager)

```bash
curl -fsSL https://bun.sh/install | bash
```

## Setup

### 1. Install Dependencies

```bash
bun install
```

### 2. Start Azurite (Local Azure Storage Emulator)

```bash
# Using Docker (recommended)
docker run -d -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  --name azurite \
  mcr.microsoft.com/azure-storage/azurite

# Or using npm (alternative)
npm install -g azurite
azurite --silent --location /tmp/azurite --debug /tmp/azurite/debug.log
```

### 3. Environment Configuration

Create `local.settings.json` (already exists):

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "node",
        "DATABASE_URL": "postgresql://postgres:password@localhost:5432/postcribe"
    }
}
```

## Development

### Build the Function

```bash
# Development build
bun run build:dev

# Production build
bun run build:prod
```

### Run Locally

#### Option 1: Using Azure Functions Core Tools (Recommended)

```bash
# Start the function
func start

# Or with verbose logging
func start --verbose
```

#### Option 2: Using Bun (Alternative)

```bash
# Run with hot reload
bun run dev

# Run once
bun run start
```

## Testing

### Test Function Logic

```bash
# Test the function logic without Azure runtime
bun run test
```

### Test Built Function

```bash
# Test the compiled JavaScript
bun run test:built
```

### Manual Testing

The function runs every minute (`0 * * * * *`) and will:

1. Query the database for due cron jobs
2. Send messages to Azure Storage Queue
3. Update `nextRunAt` for processed jobs

## Function Details

- **Schedule**: Every minute (`0 * * * * *`)
- **Queue**: `post-schedule-queue`
- **Database**: PostgreSQL (via Prisma)
- **Runtime**: Node.js 18

## Deployment

### Deploy to Azure

```bash
# Login to Azure
az login

# Deploy (requires Azure CLI)
bun run deploy
```

### Manual Deployment

```bash
# Build for production
bun run build:prod

# Deploy using Azure Functions Core Tools
func azure functionapp publish postcribe-cron-sender
```

## Troubleshooting

### Common Issues

1. **Port 10000 connection refused**: Make sure Azurite is running

    ```bash
    docker ps | grep azurite
    ```

2. **Function not loading**: Check the build output

    ```bash
    bun run build:prod
    ls -la dist/
    ```

3. **Database connection failed**: Verify DATABASE_URL in local.settings.json

### Logs

- **Local**: Check console output
- **Azure**: Use Application Insights or Azure Portal

## Project Structure

```
apps/cron-sender/
├── src/
│   ├── index.ts          # Main function
│   ├── main.ts           # Cron logic
│   └── types.ts          # Type definitions
├── dist/                 # Built files
├── host.json             # Azure Functions config
├── local.settings.json   # Local environment
└── package.json          # Dependencies
```
