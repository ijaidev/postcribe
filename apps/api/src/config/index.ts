const SENDER_EMAIL = process.env.SENDER_EMAIL || "noreply@postcribe.com";
const SENDER_NAME = process.env.SENDER_NAME || "Postcribe";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3001";
const TRUSTED_ORIGINS = process.env.TRUSTED_ORIGINS?.split(",") || [];

export { SENDER_EMAIL, SENDER_NAME, CLIENT_URL, TRUSTED_ORIGINS };
