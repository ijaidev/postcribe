import factory from "./utils/factory";
import mainRouter from "./router/main.router";
import { auth } from "@repo/auth";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { logger } from "@repo/logger";
import ApiResponse from "./utils/api-response";
import { ZodError } from "zod";
import { getZodErrorMessage } from "./utils/zod-error-message";

const app = factory
    .createApp()
    .get("/v1", c => c.json({ message: "Hello, world!" }))
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
    .route("/v1", mainRouter)
    .onError((err, c) => {
        if (err instanceof HTTPException) {
            return c.json(
                new ApiResponse({
                    message: err.message,
                    status: err.status,
                }),
                err.status,
            );
        }
        if (err instanceof ZodError) {
            return c.json(
                new ApiResponse({
                    message: getZodErrorMessage(err),
                    status: 400,
                }),
                400,
            );
        }
        logger.error({ error: err }, "Internal server error");
        return c.json(
            new ApiResponse({
                message: "Internal server error",
                status: 500,
            }),
            500,
        );
    });

export default {
    fetch: app.fetch,
    idleTimeout: 255,
    port: 3000,
    development: process.env.ENVIRONMENT === "dev",
};

export type AppType = typeof mainRouter;
