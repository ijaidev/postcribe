import xCallbackController from "../controllers/platform-login-controllers/x-callback.controller";
import xLoginController from "../controllers/platform-login-controllers/x-login.controller";
import linkedinCallbackController from "../controllers/platform-login-controllers/linkedin-callback.controller";
import linkedinLoginController from "../controllers/platform-login-controllers/linkedin-login.controller";
import factory from "../utils/factory";


const socialLoginRouter = factory.createApp()

socialLoginRouter.get("/x", ...xLoginController);
socialLoginRouter.get("/x/callback", ...xCallbackController);
socialLoginRouter.get("/linkedin", ...linkedinLoginController);
socialLoginRouter.get("/linkedin/callback", ...linkedinCallbackController);

export default socialLoginRouter;