import { auth } from "@repo/auth";
import factory from "../utils/factory";
import postRouter from "./post.router";
import { cors } from "hono/cors";
import { authorizationMiddleware } from "../middlewares/authorization";
import socialLoginRouter from "./social-login.router";

const mainRouter = factory.createApp();

mainRouter
    .use(
        "*",
        cors({
            origin: "http://localhost:3001",
            allowHeaders: ["Content-Type", "Authorization"],
            allowMethods: ["POST", "GET", "OPTIONS"],
            exposeHeaders: ["Content-Length"],
            maxAge: 600,
            credentials: true,
        }),
    )
    .use("*", async (c, next) => {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers,
        });

        if (!session) {
            c.set("user", null);
            c.set("session", null);
            return next();
        }

        c.set("user", session.user);
        c.set("session", session.session);
        return next();
    })
    .on(["POST", "GET"], "/auth/*", c => auth.handler(c.req.raw))
    .use("*", authorizationMiddleware)
    .route("/post", postRouter)
    .route("/login", socialLoginRouter);

export default mainRouter;
