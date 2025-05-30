import xMediaUploadController from "../controllers/social-upload-controllers/x-media-upload.controller";
import factory from "../utils/factory";

const socialUploadRouter = factory.createApp()

socialUploadRouter.post("/x/media", ...xMediaUploadController);

export default socialUploadRouter;