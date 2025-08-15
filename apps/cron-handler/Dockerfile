FROM oven/bun:1.2.13 AS base
WORKDIR /app
ENV NODE_ENV=production
ENV ENVIRONMENT=production

# Install all dependencies (including dev deps for building)
FROM base AS deps
WORKDIR /app

# Packages and apps
COPY out/apps/cron-handler/package.json ./apps/cron-handler/package.json
COPY out/apps/cron-sender/package.json ./apps/cron-sender/package.json
COPY out/packages ./packages

# Root metadata
COPY out/package.json ./package.json
COPY out/bun.lock ./bun.lock
COPY out/turbo.json ./turbo.json

RUN bun install

# Build the application
FROM deps AS build
WORKDIR /app

COPY out ./
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=deps /app/node_modules ./node_modules
RUN bun run build:prod

# Install only production dependencies for runtime (with full workspace resolution)
FROM base AS prod-deps
WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock /app/turbo.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/cron-handler/package.json ./apps/cron-handler/package.json
COPY --from=build /app/apps/cron-sender/package.json ./apps/cron-sender/package.json
RUN bun install --production

# Final runtime stage
FROM oven/bun:1.2.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy built apps
COPY --from=build /app/apps/cron-handler/dist ./apps/cron-handler/dist
COPY --from=build /app/apps/cron-handler/package.json ./apps/cron-handler/package.json
COPY --from=build /app/apps/cron-sender/dist ./apps/cron-sender/dist
COPY --from=build /app/apps/cron-sender/package.json ./apps/cron-sender/package.json

# Copy only required internal workspaces (dist + package.json)
# ai
COPY --from=build /app/packages/ai/dist ./packages/ai/dist
COPY --from=build /app/packages/ai/package.json ./packages/ai/package.json
# db (prisma client generated later)
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
# logger
COPY --from=build /app/packages/logger/dist ./packages/logger/dist
COPY --from=build /app/packages/logger/package.json ./packages/logger/package.json
# redis (used by ai/x)
COPY --from=build /app/packages/redis/dist ./packages/redis/dist
COPY --from=build /app/packages/redis/package.json ./packages/redis/package.json
# mailer + mail-templates
COPY --from=build /app/packages/mailer/dist ./packages/mailer/dist
COPY --from=build /app/packages/mailer/package.json ./packages/mailer/package.json
COPY --from=build /app/packages/mail-templates/dist ./packages/mail-templates/dist
COPY --from=build /app/packages/mail-templates/package.json ./packages/mail-templates/package.json
# x
COPY --from=build /app/packages/x/dist ./packages/x/dist
COPY --from=build /app/packages/x/package.json ./packages/x/package.json
# S3
COPY --from=build /app/packages/s3/dist ./packages/s3/dist
COPY --from=build /app/packages/s3/package.json ./packages/s3/package.json

# Root metadata and production node_modules
COPY --from=build /app/package.json /app/bun.lock /app/turbo.json ./
COPY --from=prod-deps /app/node_modules ./node_modules

# Generate Prisma client in runtime image (after production deps are installed)
COPY --from=build /app/packages/db/src/prisma ./packages/db/src/prisma
RUN bunx prisma generate --schema ./packages/db/src/prisma/schema.prisma

USER bun

# No port exposed; this is a queue-driven one-shot job
# Execute compiled handler directly (reads env for queue connection)
CMD ["bun", "apps/cron-handler/dist/index.js"]


