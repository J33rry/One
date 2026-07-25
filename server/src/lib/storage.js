import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";

// TODO: Replace with AWS S3 SDK (@aws-sdk/client-s3) for production.
// The interface is: uploadFile(key, readableStream, contentType) → Promise<void>
//                    getFileStream(key) → ReadableStream
//                    deleteFile(key) → Promise<void>

const uploadDir = path.resolve(env.UPLOAD_DIR);

function ensureDir() {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
}

export async function uploadFile(key, buffer, _contentType) {
    ensureDir();
    const filePath = path.join(uploadDir, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, buffer);
}

export function getFileStream(key) {
    const filePath = path.join(uploadDir, key);
    if (!fs.existsSync(filePath)) return null;
    return fs.createReadStream(filePath);
}

export async function deleteFile(key) {
    const filePath = path.join(uploadDir, key);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}
