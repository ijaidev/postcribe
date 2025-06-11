import xCallbackController from "../controllers/platform-login-controllers/x-callback.controller";
import xLoginController from "../controllers/platform-login-controllers/x-login.controller";
import linkedinCallbackController from "../controllers/platform-login-controllers/linkedin-callback.controller";
import linkedinLoginController from "../controllers/platform-login-controllers/linkedin-login.controller";
import factory from "../utils/factory";

const socialLoginRouter = factory
    .createApp()
    .get("/x", ...xLoginController)
    .get("/x/callback", ...xCallbackController)
    .get("/linkedin", ...linkedinLoginController)
    .get("/linkedin/callback", ...linkedinCallbackController);

export default socialLoginRouter;
