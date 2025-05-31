import xMediaUploadController from "../controllers/social-upload-controllers/x-media-upload.controller";
import linkedinMediaUploadController from "../controllers/social-upload-controllers/linkedin-media-upload.controller";
import factory from "../utils/factory";

const socialUploadRouter = factory.createApp()

socialUploadRouter.post("/x", ...xMediaUploadController);
socialUploadRouter.post("/linkedin", ...linkedinMediaUploadController);

export default socialUploadRouter;