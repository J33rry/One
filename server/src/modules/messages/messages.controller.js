import { asyncHandler } from "../../lib/asyncHandler.js";
import * as messagesService from "./messages.service.js";
import * as v from "./messages.validation.js";
import { broadcastToChat } from "../../ws/connectionRegistry.js";

export const getMessages = asyncHandler(async (req, res) => {
    const pagination = v.paginationSchema.parse(req.query);
    const rawMessages = await messagesService.getMessages(
        req.params.chatId,
        pagination,
    );
    
    // Map flattened db fields to nested objects expected by frontend
    const messages = rawMessages.map(msg => {
        const mapped = { ...msg };
        
        mapped.sender = {
            id: msg.senderId,
            username: msg.senderUsername,
            displayName: msg.senderDisplayName,
            avatarUrl: msg.senderAvatarUrl,
        };
        delete mapped.senderUsername;
        delete mapped.senderDisplayName;
        delete mapped.senderAvatarUrl;
        
        if (msg.mediaUrl) {
            mapped.media = {
                id: msg.mediaId,
                url: msg.mediaUrl,
                filename: msg.mediaFileName,
                mimeType: msg.mediaMimeType,
            };
        }
        delete mapped.mediaUrl;
        delete mapped.mediaFileName;
        delete mapped.mediaMimeType;
        
        return mapped;
    });

    res.json({ messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
    const body = v.sendMessageSchema.parse(req.body);
    const rawMessage = await messagesService.sendMessage(
        req.params.chatId,
        req.user.id,
        body,
    );

    const message = { ...rawMessage };
    message.sender = {
        id: message.senderId,
        username: message.senderUsername,
        displayName: message.senderDisplayName,
        avatarUrl: message.senderAvatarUrl,
    };
    delete message.senderUsername;
    delete message.senderDisplayName;
    delete message.senderAvatarUrl;
    
    if (message.mediaUrl) {
        message.media = {
            id: message.mediaId,
            url: message.mediaUrl,
            filename: message.mediaFileName,
            mimeType: message.mediaMimeType,
        };
    }
    delete message.mediaUrl;
    delete message.mediaFileName;
    delete message.mediaMimeType;

    broadcastToChat(req.params.chatId, {
        type: "message:new",
        payload: message,
    }, req.user.id);

    res.status(201).json({ message });
});

export const editMessage = asyncHandler(async (req, res) => {
    const { content } = v.editMessageSchema.parse(req.body);
    const message = await messagesService.editMessage(
        req.params.messageId,
        req.user.id,
        content,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:edit",
        payload: message,
    }, req.user.id);

    res.json({ message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const message = await messagesService.deleteMessage(
        req.params.messageId,
        req.user.id,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:delete",
        payload: { id: req.params.messageId, chatId: req.params.chatId },
    }, req.user.id);

    res.json({ message });
});

export const addReaction = asyncHandler(async (req, res) => {
    const { reaction } = v.addReactionSchema.parse(req.body);
    const result = await messagesService.addReaction(
        req.params.messageId,
        req.user.id,
        reaction,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:reaction",
        payload: {
            messageId: req.params.messageId,
            userId: req.user.id,
            reaction,
            action: "add",
        },
    }, req.user.id);

    res.status(201).json({ reaction: result });
});

export const removeReaction = asyncHandler(async (req, res) => {
    const { reaction } = v.removeReactionSchema.parse(req.body);
    await messagesService.removeReaction(
        req.params.messageId,
        req.user.id,
        reaction,
    );

    broadcastToChat(req.params.chatId, {
        type: "message:reaction",
        payload: {
            messageId: req.params.messageId,
            userId: req.user.id,
            reaction,
            action: "remove",
        },
    }, req.user.id);

    res.status(204).end();
});

export const markRead = asyncHandler(async (req, res) => {
    const { messageIds } = v.markReadSchema.parse(req.body);
    await messagesService.markRead(req.params.chatId, messageIds, req.user.id);

    broadcastToChat(req.params.chatId, {
        type: "message:status",
        payload: {
            messageIds,
            userId: req.user.id,
            status: "read",
        },
    }, req.user.id);

    res.json({ message: "Marked as read" });
});
