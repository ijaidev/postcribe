interface RollingFileOptions {
    interval?: string;
    maxSize?: string;
    directory?: string;
    compress?: boolean;
    filename?: string;
    maxFiles?: number;
}

declare module "pino-roll" {
    export function createRollingFile(options: RollingFileOptions): Promise<{
        write: (data: string) => void;
        end: () => void;
    }>;
}
