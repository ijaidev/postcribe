interface ApiResponseProps<T> {
    message: string;
    data?: T;
}
class ApiResponse<T> {
    message: string;
    data?: T;

    constructor({ message, data }: ApiResponseProps<T>) {
        this.message = message;
        this.data = data;
    }
}

export default ApiResponse;
