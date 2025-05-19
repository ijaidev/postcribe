import { S3Client } from "@aws-sdk/client-s3";

const s3 = new S3Client({
    region: "auto",
    endpoint: process.env.R2_API_URL as string,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY as string,
    },
});

export default s3;
