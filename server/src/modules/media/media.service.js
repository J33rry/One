import crypto from "node:crypto";
import { AppError } from "../../lib/AppError.js";
import { uploadFile, getFileStream } from "../../lib/storage.js";
import * as repo from "./media.repository.js";

export async function saveMetadata(userId, data) {
    return repo.createMedia({
        uploaderId: userId,
        storageId: data.storageId,
        fileName: data.fileName,
        mimeType: data.mimeType,
        fileSize: BigInt(data.fileSize),
    });
}

export async function download(mediaId, userId) {
    const hasAccess = await repo.canUserAccessMedia(mediaId, userId);
    if (!hasAccess) {
        throw new AppError(403, "No access to this media", "FORBIDDEN");
    }

    const m = await repo.findMediaById(mediaId);
    if (!m) throw new AppError(404, "Media not found", "NOT_FOUND");

    return { redirectUrl: m.storageId, mimeType: m.mimeType, fileName: m.fileName };
}
