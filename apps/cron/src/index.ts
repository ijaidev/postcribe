import type { Handler } from "aws-lambda";
import main from "./main";

export const handler: Handler = async () => {
    await main();
};
