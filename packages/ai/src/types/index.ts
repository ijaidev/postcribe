interface Post {
    post: string;
    options: string[];
    version: number;
    messageId: string;
    __apply_version?: number;
}

interface Image {
    imageUrl: string;
    version: number;
    messageId: string;
    __apply_version?: number;
}

export type { Post, Image };
