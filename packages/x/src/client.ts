import { Client, auth } from "twitter-api-sdk";

const xAuthClient = new auth.OAuth2User({
    client_id: process.env.CLIENT_ID as string,
    client_secret: process.env.CLIENT_SECRET as string,
    callback: process.env.TWITTER_CALLBACK_URL as string,
    scopes: ["tweet.read", "users.read", "offline.access", "tweet.write"],
});

const xClient = new Client(xAuthClient);

export {xClient, xAuthClient}
