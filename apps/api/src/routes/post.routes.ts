import getPostsController from "../controllers/post-controllers/get-posts.controller";
import postGenController from "../controllers/post-controllers/post-gen.controller";
import factory from "../utils/factory";

const postRouter = factory.createApp();

postRouter.post("/draft", ...postGenController);
postRouter.get("/draft/posts", ...getPostsController);
export default postRouter;