import type { Handler } from "aws-lambda";
import main from "./main";
import { logger } from "@repo/logger";

export const handler: Handler = async () => {
    try {
        await main();
    } catch (error) {
        logger.error(error);
        throw error;
    }
};
