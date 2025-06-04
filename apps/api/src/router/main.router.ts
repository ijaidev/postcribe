import { auth } from "@repo/auth";
import factory from "../utils/factory";
import postRouter from "./post.router";
import { authorizationMiddleware } from "../middlewares/authorization";
import socialLoginRouter from "./social-login.router";
import socialUploadRouter from "./social-upload.router";

const mainRouter = factory.createApp();

mainRouter
    .on(["POST", "GET"], "/auth/*", c => auth.handler(c.req.raw))
    .use("*", authorizationMiddleware)
    .route("/post", postRouter)
    .route("/social/login", socialLoginRouter)
    .route("/social/media/upload", socialUploadRouter);

export default mainRouter;
