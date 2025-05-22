import ApiResponse from "../utils/api-response";
import factory from "../utils/factory";

const postGenController = factory.createHandlers(async c => {
    console.log("reached here");
    return c.json(
        new ApiResponse({
            statusCode: 200,
            message: "Hello World",
            data: { message: "Hello World" },
            error: null,
        }),
    );
});

export default postGenController;
