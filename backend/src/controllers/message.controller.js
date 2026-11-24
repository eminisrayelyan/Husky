import { sendMessage, getMessages, markMessagesRead } from "../services/message.service.js";

async function sendMessageController(req, res, next) {
    try {
        const { message, recipientId, senderName } = await sendMessage(
            req.session.userId,
            req.params.conversationId,
            res.locals.messageData
        );

        try {
            const io = req.app.get("io");

            io.to(`user:${recipientId}`).emit("new-message", {
                message,
                senderName,
            });
        } catch (error) {
            console.error("Could not send message notification:", error);
        }

        return res.status(201).json({ message });
    } catch (error) {
        next(error);
    }
}

async function getMessagesController(req, res, next) {
    try {
        const messages = await getMessages(
            req.session.userId,
            req.params.conversationId
        );

        return res.status(200).json({ messages });
    } catch (error) {
        next(error);
    }
}

async function markMessagesReadController(req, res, next) {
    try {
        const unreadCount = await markMessagesRead(
            req.session.userId,
            req.params.conversationId,
            req.body?.lastMessageId
        );
        return res.json({ unread_count: unreadCount });
    } catch (error) {
        next(error);
    }
}

export { sendMessageController, getMessagesController, markMessagesReadController };
