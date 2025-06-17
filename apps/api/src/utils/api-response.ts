interface ApiResponseProps<T> {
    success?: boolean;
    status: number;
    message: string;
    data?: T;
}
class ApiResponse<T> {
    success?: boolean;
    status: number;
    message: string;
    data?: T;

    constructor({ message, data, status }: ApiResponseProps<T>) {
        this.success = status >= 200 && status < 300;
        this.status = status;
        this.message = message;
        this.data = data;
    }
}

export default ApiResponse;
