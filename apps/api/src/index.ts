import factory from "./utils/factory";
import postRouter from "./router/post.router";
import mainRouter from "./router/main.router";
import { auth } from "@repo/auth";
import { cors } from "hono/cors";
const app = factory.createApp();

app.use(
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
    .route("/v1", mainRouter);

export default {
    fetch: app.fetch,
    idleTimeout: 255,
    port: 3000,
    development: process.env.ENVIRONMENT === "dev",
};
