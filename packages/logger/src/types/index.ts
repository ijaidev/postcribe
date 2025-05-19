export const LOG_LEVELS = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
} as const;

export interface ConsoleTransportConfig {
    enabled: boolean;
    options: {
        colorize: boolean;
        ignore: string;
        translateTime: string;
    };
}

export interface FileTransportConfig {
    enabled: boolean;
    options: {
        directory: string;
        filename: string;
        maxSize: string;
        maxFiles: number;
        compress: boolean;
        retention?: string;
    };
}

export interface RollingFileOptions {
    file: string | (() => string);
    size?: string | number;
    frequency?: string | number;
    extension?: string;
    symlink?: boolean;
    limit?: {
        count?: number;
    };
    dateFormat?: string;
    mkdir?: boolean;
}

export interface FileOptions {
    enabled: boolean;
    options: RollingFileOptions;
}
