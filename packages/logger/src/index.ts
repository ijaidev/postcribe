import pino, { type TransportTargetOptions } from "pino";
import { LOG_LEVELS } from "./types/index.js";
import {
    LOGGER_CONFIG,
    FILE_OPTIONS,
    CONSOLE_TRANSPORT_CONFIG,
} from "./config/index.js";
import dotenv from "dotenv";
dotenv.config();

const transports: TransportTargetOptions[] = [];

async function initializeLogger() {
    try {
        // Only use pretty console transport in non-production
        if (
            process.env.ENV !== "production" &&
            CONSOLE_TRANSPORT_CONFIG.enabled
        ) {
            transports.push({
                target: "pino-pretty",
                level: process.env.LOG_LEVEL || "info",
                options: CONSOLE_TRANSPORT_CONFIG.options,
            });
        }

        if (FILE_OPTIONS.enabled) {
            transports.push({
                target: "pino-roll",
                options: {
                    ...FILE_OPTIONS.options,
                },
            });
        }
    } catch (error) {
        console.error("Failed to initialize logger transports:", error);
    }
}

initializeLogger();

const logger = pino({
    ...LOGGER_CONFIG,
    ...(transports.length > 0
        ? {
              transport: {
                  targets: transports,
              },
          }
        : {}),
});

if (process.env.ENV !== "production") {
    console.log(`Logger initialized with ${transports.length} transports`);
    if (transports.length > 0) {
        console.log("File logging enabled:", FILE_OPTIONS.enabled);
        console.log(
            "Console logging enabled:",
            CONSOLE_TRANSPORT_CONFIG.enabled,
        );
    }
}

// Note: In production, using default pino console logging (no transports)
// File logging is temporarily disabled

export { logger, LOG_LEVELS };
