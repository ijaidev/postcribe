import factory from "../utils/factory";
import { HTTPException } from "hono/http-exception";

const authorizationMiddleware = factory.createMiddleware(async (c, next) => {
    const user = c.get("user");
    const session = c.get("session");
    if (!user || !session) {
        throw new HTTPException(401, {
            message: "Unauthorized",
        });
    }
    return next();
});

export { authorizationMiddleware };