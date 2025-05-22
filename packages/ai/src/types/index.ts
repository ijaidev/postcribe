interface Post {
    post: string;
    options: string[];
    version: number;
    messageId: string;
}

interface Image {
    imageUrl: string;
    version: number;
    messageId: string;
}

export type { Post, Image };
