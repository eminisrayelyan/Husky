import { sendMessage, getMessages, } from "../services/message.service.js";
import prisma from "../db/prisma.js";

async function sendMessageController(req, res, next) {
    try {
        const message = await sendMessage(
            req.session.userId,
            req.params.conversationId,
            res.locals.messageData
        );

        try {
            const conversation = await prisma.conversations.findUnique({
                where: {
                    id: BigInt(message.conversation_id),
                },
            });

            const sender = await prisma.users.findUnique({
                where: {
                    id: BigInt(req.session.userId),
                },
                select: {
                    first_name: true,
                    last_name: true,
                },
            });

            const senderId = BigInt(req.session.userId);

            const recipientId =
                conversation.user_one_id === senderId
                    ? conversation.user_two_id
                    : conversation.user_one_id;

            const io = req.app.get("io");

            io.to(`user:${recipientId}`).emit("new-message", {
                message,
                senderName: `${sender.first_name} ${sender.last_name}`,
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

export { sendMessageController, getMessagesController };