import getPostsController from "../controllers/post-controllers/get-posts.controller";
import imageGenController from "../controllers/post-controllers/image-gen.controller";
import postGenController from "../controllers/post-controllers/post-gen.controller";
import postSuggestionsController from "../controllers/post-controllers/post-suggestions.controller";
import factory from "../utils/factory";

const postRouter = factory
    .createApp()
    .post("/draft", ...postGenController)
    .get("/draft/posts", ...getPostsController)
    .post("/draft/image", ...imageGenController)
    .post("/suggestions", ...postSuggestionsController);

export default postRouter;
