import postGenController from "../controllers/post-gen.controller";
import factory from "../utils/factory";

const postRouter = factory.createApp();

postRouter.get("/", ...postGenController);

export default postRouter;