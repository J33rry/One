import { asyncHandler } from "../../lib/asyncHandler.js";
import * as chatsService from "./chats.service.js";
import * as v from "./chats.validation.js";

export const listChats = asyncHandler(async (req, res) => {
    const chats = await chatsService.listChats(req.user.id);
    res.json({ chats });
});

export const createChat = asyncHandler(async (req, res) => {
    const body = v.createChatSchema.parse(req.body);
    const chat = await chatsService.createChat(req.user.id, body);
    res.status(201).json({ chat });
});

export const getChat = asyncHandler(async (req, res) => {
    const chat = await chatsService.getChat(req.params.chatId, req.user.id);
    res.json({ chat });
});

export const updateChat = asyncHandler(async (req, res) => {
    const body = v.updateChatSchema.parse(req.body);
    const chat = await chatsService.updateChat(req.params.chatId, body);
    res.json({ chat });
});

export const deleteChat = asyncHandler(async (req, res) => {
    await chatsService.deleteChat(req.params.chatId, req.user.id);
    res.status(204).end();
});

export const addParticipants = asyncHandler(async (req, res) => {
    const { userIds } = v.addParticipantsSchema.parse(req.body);
    const participants = await chatsService.addParticipants(
        req.params.chatId,
        userIds,
    );
    res.status(201).json({ participants });
});

export const updateParticipant = asyncHandler(async (req, res) => {
    const { role } = v.updateParticipantSchema.parse(req.body);
    const participant = await chatsService.updateParticipantRole(
        req.params.chatId,
        req.params.userId,
        role,
    );
    res.json({ participant });
});

export const removeParticipant = asyncHandler(async (req, res) => {
    await chatsService.removeParticipant(
        req.params.chatId,
        req.params.userId,
        req.user.id,
    );
    res.status(204).end();
});
