interface ApiResponseProps<T> {
    statusCode: number;
    message: string;
    data?: T;
    error?: string;
}
class ApiResponse<T> {
    statusCode: number;
    message: string;
    data?: T;
    error?: string;

    constructor({ statusCode, message, data, error }: ApiResponseProps<T>) {
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
        this.error = error;
    }
}

export default ApiResponse;
