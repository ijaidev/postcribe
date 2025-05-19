export const serializeError = (error: Error): Record<string, unknown> => ({
    type: error.constructor.name,
    message: error.message,
    stack: error.stack,
});
