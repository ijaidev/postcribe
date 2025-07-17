import applyVersionController from "../controllers/post-controllers/apply.controller";
import getDraftsController from "../controllers/post-controllers/get-drafts.controller";
import getPostsController from "../controllers/post-controllers/get-posts.controller";
import imageGenController from "../controllers/post-controllers/image-gen.controller";
import imageUploadController from "../controllers/post-controllers/image-upload.controller";
import nameGenController from "../controllers/post-controllers/name-gen.controller";
import postGenController from "../controllers/post-controllers/post-gen.controller";
import postSuggestionsController from "../controllers/post-controllers/post-suggestions.controller";
import factory from "../utils/factory";

const postRouter = factory
    .createApp()
    // generate post
    .post("/draft", ...postGenController)
    // apply version
    .post("/draft/apply", ...applyVersionController)
    // upload image
    .post("/draft/image/upload", ...imageUploadController)
    // get posts
    .get("/draft/posts", ...getPostsController)
    // generate image
    .post("/draft/image/generate", ...imageGenController)
    // get suggestions
    .post("/suggestions", ...postSuggestionsController)
    // generate name
    .post("/draft/name", ...nameGenController)
    // get drafts
    .get("/drafts", ...getDraftsController);

export default postRouter;
