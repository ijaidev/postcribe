import dotenv from "dotenv";
dotenv.config();

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;

export { R2_PUBLIC_URL, R2_BUCKET_NAME };
