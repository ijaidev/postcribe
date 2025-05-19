import { type LoggerOptions } from "pino";
import { serializeError } from "../utils/index.js";
import { type ConsoleTransportConfig, type FileOptions } from "../types/index.js";
import dotenv from "dotenv";
import { join } from "path";

dotenv.config();

const shouldEnableFileLogging = process.env.ENV === "production";

const shouldEnableConsoleLogging = process.env.ENV === "development";

const logDir = process.env.LOG_DIRECTORY || "logs";

const FILE_OPTIONS: FileOptions = {
    enabled: shouldEnableFileLogging,
    options: {
        file: join(logDir, "log"),
        frequency: "daily",
        mkdir: true,
        extension: ".log",
        limit: {
            count: 10,
        },
        dateFormat: "yyyy-MM-dd",
    },
};

const CONSOLE_TRANSPORT_CONFIG: ConsoleTransportConfig = {
    enabled: shouldEnableConsoleLogging,
    options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "SYS:standard",
    },
};

const LOGGER_CONFIG: LoggerOptions = {
    level: process.env.LOG_LEVEL || "info",
    redact: ["password", "token", "secret", "key", "authorization"],
    serializers: {
        error: serializeError,
        err: serializeError,
    },
    timestamp: true,
    base: {
        env: process.env.ENV,
    },
};

export { LOGGER_CONFIG, FILE_OPTIONS, CONSOLE_TRANSPORT_CONFIG };
