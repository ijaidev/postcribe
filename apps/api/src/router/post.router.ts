import getPostsController from "../controllers/post-controllers/get-posts.controller";
import imageGenController from "../controllers/post-controllers/image-gen.controller";
import postGenController from "../controllers/post-controllers/post-gen.controller";
import factory from "../utils/factory";

const postRouter = factory.createApp();

postRouter.post("/draft", ...postGenController);
postRouter.get("/draft/posts", ...getPostsController);
postRouter.post("/draft/image", ...imageGenController);
// postRouter.post("/draft/post", ...schedulePostController);
export default postRouter;