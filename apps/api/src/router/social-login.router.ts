// import xCallbackController from "../controllers/platform-login-controllers/x-callback.controller";
import xLoginController from "../controllers/platform-controllers/x-login.controller";
import getSocialAccountsController from "../controllers/platform-controllers/get-social-accounts.controller";
import factory from "../utils/factory";
// import linkedinMediaUploadController from "../controllers/social-upload-controllers/linkedin-media-upload.controller";
// import xMediaUploadController from "../controllers/social-upload-controllers/x-media-upload.controller";
import linkedinLoginController from "../controllers/platform-controllers/linkedin-login.controller";
import linkedinCallbackController from "../controllers/platform-controllers/linkedin-callback.controller";
import disconnectAccountController from "../controllers/platform-controllers/disconnect-account.controller";

const socialLoginRouter = factory
    .createApp()
    .get("/accounts", ...getSocialAccountsController)
    .post("/accounts/disconnect", ...disconnectAccountController)

    // .post("/media/upload/x", ...xMediaUploadController)
    // .post("/media/upload/linkedin", ...linkedinMediaUploadController)

    .post("/login/x", ...xLoginController)
    // .get("/login/x/callback", ...xCallbackController)
    // .post("/login/linkedin", ...linkedinLoginController)
    // .get("/login/linkedin/callback", ...linkedinCallbackController);

export default socialLoginRouter;
