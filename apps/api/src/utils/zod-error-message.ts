import { ZodError } from "zod";

/**
 * Extracts the first error message from a Zod validation error
 * @param error - The ZodError object
 * @param fallbackMessage - Default message if no error found
 * @returns Clean error message string
 */
export function getZodErrorMessage(
    error: ZodError,
    fallbackMessage: string = "Invalid request",
): string {
    const firstError = error.errors[0];

    if (!firstError) {
        return fallbackMessage;
    }

    // Return the error message with field context if available
    if (firstError.path.length > 0) {
        const fieldPath = firstError.path.join(".");
        return `${fieldPath}: ${firstError.message}`;
    }

    return firstError.message;
}

/**
 * Gets all error messages from a Zod validation error
 * @param error - The ZodError object
 * @returns Array of error message strings
 */
export function getAllZodErrorMessages(error: ZodError): string[] {
    return error.errors.map(err => {
        if (err.path.length > 0) {
            const fieldPath = err.path.join(".");
            return `${fieldPath}: ${err.message}`;
        }
        return err.message;
    });
}
