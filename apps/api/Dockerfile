FROM oven/bun:1.2.13 AS base
WORKDIR /app
ENV NODE_ENV=production
ENV ENVIRONMENT=production


FROM base AS deps
# Copy minimal workspace files (root + packages + api manifest)
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json

RUN bun install

FROM deps AS build
# Bring in sources for packages and api
COPY packages ./packages
COPY apps/api ./apps/api

# Build all workspaces (packages first, then api) via turbo
RUN bun run build:prod

FROM base AS prod-deps
# Install only production dependencies for runtime
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/api/package.json apps/api/package.json
RUN bun install --production

FROM oven/bun:1.2.13-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=build /app/apps/api/dist ./dist
# Provide workspace manifests and built packages for runtime
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/bun.lock ./bun.lock
COPY --from=build /app/packages ./packages

# Use node_modules from deps (includes all needed runtime deps)
COPY --from=deps /app/node_modules ./node_modules


USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD bun -e "fetch('http://localhost:3000/v1').then(r=>{process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"

CMD ["bun", "./dist/index.js"]


