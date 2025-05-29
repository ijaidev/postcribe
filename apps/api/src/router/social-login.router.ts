import xCallbackController from "../controllers/platform-login-controllers/x-callback.controller";
import xLoginController from "../controllers/platform-login-controllers/x-login.controller";
import factory from "../utils/factory";


const socialLoginRouter = factory.createApp()

socialLoginRouter.get("/x", ...xLoginController);
socialLoginRouter.get("/x/callback", ...xCallbackController);

export default socialLoginRouter;