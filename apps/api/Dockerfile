FROM oven/bun:1.2.13 AS base
WORKDIR /app
ENV NODE_ENV=production
ENV ENVIRONMENT=production

# Install all dependencies (including dev deps for building)
FROM base AS deps
WORKDIR /app

COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json
RUN bun install

# Build the application
FROM deps AS build
WORKDIR /app

COPY packages ./packages
COPY apps/api ./apps/api
RUN bun run build:prod

# Install only production dependencies for runtime (with full workspace resolution)
FROM base AS prod-deps
WORKDIR /app

COPY --from=build /app/package.json /app/bun.lock /app/turbo.json ./
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
RUN bun install --production

# Final runtime stage
FROM oven/bun:1.2.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Copy built API output
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Copy only required internal workspaces (dist + package.json)
# ai
COPY --from=build /app/packages/ai/dist ./packages/ai/dist
COPY --from=build /app/packages/ai/package.json ./packages/ai/package.json
# auth (depends on db, logger, mail-templates, mailer)
COPY --from=build /app/packages/auth/dist ./packages/auth/dist
COPY --from=build /app/packages/auth/package.json ./packages/auth/package.json
# db (prisma client generated later)
COPY --from=build /app/packages/db/dist ./packages/db/dist
COPY --from=build /app/packages/db/package.json ./packages/db/package.json
# logger
COPY --from=build /app/packages/logger/dist ./packages/logger/dist
COPY --from=build /app/packages/logger/package.json ./packages/logger/package.json
# s3
COPY --from=build /app/packages/s3/dist ./packages/s3/dist
COPY --from=build /app/packages/s3/package.json ./packages/s3/package.json
# x
COPY --from=build /app/packages/x/dist ./packages/x/dist
COPY --from=build /app/packages/x/package.json ./packages/x/package.json
# redis (used by ai/x)
COPY --from=build /app/packages/redis/dist ./packages/redis/dist
COPY --from=build /app/packages/redis/package.json ./packages/redis/package.json
# mailer + mail-templates (used by auth)
COPY --from=build /app/packages/mailer/dist ./packages/mailer/dist
COPY --from=build /app/packages/mailer/package.json ./packages/mailer/package.json
COPY --from=build /app/packages/mail-templates/dist ./packages/mail-templates/dist
COPY --from=build /app/packages/mail-templates/package.json ./packages/mail-templates/package.json
COPY --from=build /app/package.json /app/bun.lock ./

COPY --from=prod-deps /app/node_modules ./node_modules

# Generate Prisma client at runtime image (after production deps are installed)
COPY --from=build /app/packages/db/src/prisma ./packages/db/src/prisma
RUN bunx prisma generate --schema ./packages/db/src/prisma/schema.prisma

USER bun
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/v1').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

WORKDIR /app/apps/api
CMD ["bun", "start"]
