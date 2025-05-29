import { auth } from "@repo/auth";
import factory from "../utils/factory";
import postRouter from "./post.router";
import { cors } from "hono/cors";
import { authorizationMiddleware } from "../middlewares/authorization";
import socialLoginRouter from "./social-login.router";

const mainRouter = factory.createApp();

mainRouter
    .on(["POST", "GET"], "/auth/*", c => auth.handler(c.req.raw))
    .use("*", authorizationMiddleware)
    .route("/post", postRouter)
    .route("/login", socialLoginRouter);

export default mainRouter;
