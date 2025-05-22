interface ApiResponseProps<T> {
    statusCode: number;
    message: string;
    data: T;
    error: string | null;
}
class ApiResponse<T> implements ApiResponseProps<T> {
    statusCode: number;
    message: string;
    data: T;
    error: string | null;

    constructor({ statusCode, message, data, error }: ApiResponseProps<T>) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.error = error;
    }
}

export default ApiResponse;
