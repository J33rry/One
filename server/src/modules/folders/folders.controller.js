import { asyncHandler } from "../../lib/asyncHandler.js";
import * as foldersService from "./folders.service.js";
import * as v from "./folders.validation.js";

export const listFolders = asyncHandler(async (req, res) => {
    const folders = await foldersService.listFolders(req.user.id);
    res.json({ folders });
});

export const createFolder = asyncHandler(async (req, res) => {
    const body = v.createFolderSchema.parse(req.body);
    const folder = await foldersService.createFolder(req.user.id, body);
    res.status(201).json({ folder });
});

export const updateFolder = asyncHandler(async (req, res) => {
    const body = v.updateFolderSchema.parse(req.body);
    const folder = await foldersService.updateFolder(req.params.folderId, body);
    res.json({ folder });
});

export const deleteFolder = asyncHandler(async (req, res) => {
    await foldersService.deleteFolder(req.params.folderId);
    res.status(204).end();
});

export const listFolderChats = asyncHandler(async (req, res) => {
    const chatIds = await foldersService.listFolderChatIds(req.params.folderId);
    res.json({ chatIds });
});

export const addChatToFolder = asyncHandler(async (req, res) => {
    const { chatId } = v.addChatSchema.parse(req.body);
    const chatIds = await foldersService.addChatToFolder(
        req.params.folderId,
        chatId,
        req.user.id,
    );
    res.status(201).json({ chatIds });
});

export const removeChatFromFolder = asyncHandler(async (req, res) => {
    const chatIds = await foldersService.removeChatFromFolder(
        req.params.folderId,
        req.params.chatId,
    );
    res.json({ chatIds });
});
