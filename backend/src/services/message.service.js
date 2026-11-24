import prisma from "../db/prisma.js";

async function sendMessage(userId, conversationId, { body }) {
    const senderId = BigInt(userId);
    let chatId;

    try {
        chatId = BigInt(conversationId);

        if (chatId <= 0n || chatId > 9223372036854775807n) {
            throw new Error();
        }
    } catch {
        const error = new Error("Invalid conversation ID");
        error.status = 400;
        throw error;
    }

    const conversation = await prisma.conversations.findUnique({
        where: {
            id: chatId,
        },
    });

    if (
        !conversation ||
        (
            conversation.user_one_id !== senderId &&
            conversation.user_two_id !== senderId
        )
    ) {
        const error = new Error("Conversation not found");
        error.status = 404;
        throw error;
    }

    const message = await prisma.messages.create({
        data: {
            conversation_id: chatId,
            sender_id: senderId,
            body,
        },
        include: {
            users: { select: { first_name: true, last_name: true } },
        },
    });

    return {
        message: {
            id: message.id.toString(),
            conversation_id: message.conversation_id.toString(),
            sender_id: message.sender_id.toString(),
            body: message.body,
            created_at: message.created_at,
        },
        recipientId: (conversation.user_one_id === senderId
            ? conversation.user_two_id
            : conversation.user_one_id).toString(),
        senderName: `${message.users.first_name} ${message.users.last_name}`,
    };
}

async function getMessages(userId, conversationId) {
    const currentUserId = BigInt(userId);
    let chatId;

    try {
        chatId = BigInt(conversationId);

        if (chatId <= 0n || chatId > 9223372036854775807n) {
            throw new Error();
        }
    } catch {
        const error = new Error("Invalid conversation ID");
        error.status = 400;
        throw error;
    }

    const conversation = await prisma.conversations.findUnique({
        where: {
            id: chatId,
        },
    });

    if (
        !conversation ||
        (
            conversation.user_one_id !== currentUserId &&
            conversation.user_two_id !== currentUserId
        )
    ) {
        const error = new Error("Conversation not found");
        error.status = 404;
        throw error;
    }

    const messages = await prisma.messages.findMany({
        where: {
            conversation_id: chatId,
        },
        orderBy: {
            id: "desc",
        },
        take: 50,
    });

    return messages.reverse().map((message) => ({
        id: message.id.toString(),
        conversation_id: message.conversation_id.toString(),
        sender_id: message.sender_id.toString(),
        body: message.body,
        created_at: message.created_at,
    }));
}

async function markMessagesRead(userId, conversationId, lastMessageId) {
    let chatId;
    let messageId;

    try {
        if (typeof lastMessageId !== "string" || !/^\d+$/.test(lastMessageId)) {
            throw new Error();
        }
        chatId = BigInt(conversationId);
        messageId = BigInt(lastMessageId);
        if (chatId <= 0n || messageId <= 0n ||
            chatId > 9223372036854775807n || messageId > 9223372036854775807n) {
            throw new Error();
        }
    } catch {
        const error = new Error("Invalid conversation or message ID");
        error.status = 400;
        throw error;
    }

    const currentUserId = BigInt(userId);
    const conversation = await prisma.conversations.findFirst({
        where: {
            id: chatId,
            OR: [{ user_one_id: currentUserId }, { user_two_id: currentUserId }],
        },
    });

    if (!conversation) {
        const error = new Error("Conversation not found");
        error.status = 404;
        throw error;
    }

    const incoming = {
        conversation_id: chatId,
        sender_id: { not: currentUserId },
        read_at: null,
    };

    await prisma.messages.updateMany({
        where: { ...incoming, id: { lte: messageId } },
        data: { read_at: new Date() },
    });

    return prisma.messages.count({ where: incoming });
}

export { sendMessage, getMessages, markMessagesRead };
