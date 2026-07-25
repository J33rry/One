import { asyncHandler } from "../../lib/asyncHandler.js";
import * as mediaService from "./media.service.js";

import { generateUploadSignature } from "../../lib/cloudinary.js";
import { z } from "zod";

export const getUploadSignature = asyncHandler(async (req, res) => {
    const signatureData = generateUploadSignature();
    res.json(signatureData);
});

const saveMetadataSchema = z.object({
    storageId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    fileSize: z.number(),
});

export const saveMediaMetadata = asyncHandler(async (req, res) => {
    const body = saveMetadataSchema.parse(req.body);
    const media = await mediaService.saveMetadata(req.user.id, body);
    res.status(201).json({ media });
});

export const downloadMedia = asyncHandler(async (req, res) => {
    const { redirectUrl } = await mediaService.download(
        req.params.mediaId,
        req.user.id,
    );

    res.redirect(redirectUrl);
});
