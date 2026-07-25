import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";

cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Generates an upload signature for client-side direct uploads.
 * The client needs this signature, the timestamp, and the api_key to upload securely.
 */
export function generateUploadSignature() {
    const timestamp = Math.round(new Date().getTime() / 1000);
    // You can add folder names or other signed params here if needed.
    const signature = cloudinary.utils.api_sign_request(
        {
            timestamp: timestamp,
            folder: "chat_media", // Optional: organize uploads into a folder
        },
        env.CLOUDINARY_API_SECRET,
    );

    return {
        signature,
        timestamp,
        apiKey: env.CLOUDINARY_API_KEY,
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        folder: "chat_media",
    };
}

export default cloudinary;
