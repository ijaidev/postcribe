import { logger } from "@repo/logger";
import Redis from "ioredis";

// Redis client instance
let redis: Redis;

// Create Redis client with configuration
function getRedisClient(): Redis {
    if (redis) {
        return redis;
    }
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    try {
        const client = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            keepAlive: 30000,
        });
        // Connection event handlers
        client.on("connect", () => {
            logger.info("Redis client connected");
        });

        client.on("ready", () => {
            logger.info("Redis client ready");
        });

        client.on("error", err => {
            logger.error({ error: err }, "Redis client error");
        });

        client.on("close", () => {
            logger.info("Redis client connection closed");
        });

        client.on("reconnecting", () => {
            logger.info("Redis client reconnecting...");
        });

        redis = client;
        return client;
    } catch (error) {
        logger.error({ error }, "Failed to create Redis client");
        throw error;
    }
}

export { getRedisClient };
