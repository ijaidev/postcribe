import {
    PutObjectCommand,
    type PutObjectCommandOutput,
} from "@aws-sdk/client-s3";
import s3 from "../client";
import { R2_BUCKET_NAME, R2_PUBLIC_URL } from "../config/consts";
import dotenv from "dotenv";
dotenv.config();

interface InputImage {
    base64: string;
    contentType: "image/png" | "image/jpeg" | "image/webp";
}

type UploadImagesInput = InputImage[];

const uploadImages = async (images: UploadImagesInput): Promise<string[]> => {
    if (!images || images.length === 0) {
        return [];
    }

    const promises = images.map(async image => {
        const image_bytes = Buffer.from(image.base64, "base64");
        const key = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${image.contentType.split("/")[1]}`;
        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key,
            Body: image_bytes,
            ContentType: image.contentType,
        });

        return new Promise<{ data: PutObjectCommandOutput; url: string }>(
            (resolve, reject) => {
                s3.send(command, (err, data) => {
                    if (err) reject(err);
                    resolve({
                        data: data as PutObjectCommandOutput,
                        url: `${R2_PUBLIC_URL}/${R2_BUCKET_NAME}/${key}`,
                    });
                });
            },
        );
    });

    const response = await Promise.all(promises);

    return response.map(r => r.url);
};

export { uploadImages, type UploadImagesInput };
