import prisma from "../db/prisma.js";
import supabase from "../db/supabase.js";

async function getOrCreateConversation(userId, otherUserId) {
    const currentUserId = BigInt(userId);
    const recipientId = BigInt(otherUserId);

    if (currentUserId === recipientId) {
        const error = new Error("You cannot start a conversation with yourself");
        error.status = 400;
        throw error;
    }

    const otherUser = await prisma.users.findUnique({
        where: { id: recipientId },
        select: { id: true },
    });

    if (!otherUser) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    const user_one_id =
        currentUserId < recipientId ? currentUserId : recipientId;

    const user_two_id =
        currentUserId < recipientId ? recipientId : currentUserId;

    const where = {
        user_one_id_user_two_id: {
            user_one_id,
            user_two_id,
        },
    };

    let conversation = await prisma.conversations.findUnique({
        where,
    });

    if (!conversation) {
        try {
            conversation = await prisma.conversations.create({
                data: {
                    user_one_id,
                    user_two_id,
                },
            });
        } catch (error) {
            if (error.code !== "P2002") {
                throw error;
            }

            conversation = await prisma.conversations.findUniqueOrThrow({
                where,
            });
        }
    }

    return {
        id: conversation.id.toString(),
        user_one_id: conversation.user_one_id.toString(),
        user_two_id: conversation.user_two_id.toString(),
        created_at: conversation.created_at,
    };
}

async function getConversations(userId) {
    const currentUserId = BigInt(userId);

    const userFields = {
        id: true,
        first_name: true,
        last_name: true,
        photos: {
            select: {
                storage_key: true,
            },
        },
    };

    const conversations = await prisma.conversations.findMany({
        where: {
            OR: [
                { user_one_id: currentUserId },
                { user_two_id: currentUserId },
            ],
        },
        select: {
            id: true,
            users_conversations_user_one_idTousers: {
                select: userFields,
            },
            users_conversations_user_two_idTousers: {
                select: userFields,
            },
            messages: {
                orderBy: { id: "desc" },
                take: 1,
                select: {
                    id: true,
                    sender_id: true,
                    body: true,
                    created_at: true,
                },
            },
        },
        orderBy: { id: "desc" },
        take: 50,
    });

    return conversations.map((conversation) => {
        const userOne = conversation.users_conversations_user_one_idTousers;
        const userTwo = conversation.users_conversations_user_two_idTousers;

        const otherUser =
            userOne.id === currentUserId ? userTwo : userOne;

        let photoUrl = null;

        if (otherUser.photos) {
            const { data } = supabase.storage
                .from("avatars")
                .getPublicUrl(otherUser.photos.storage_key);

            photoUrl = data.publicUrl;
        }

        const lastMessage = conversation.messages[0];

        return {
            id: conversation.id.toString(),
            other_user: {
                id: otherUser.id.toString(),
                first_name: otherUser.first_name,
                last_name: otherUser.last_name,
                photo_url: photoUrl,
            },
            last_message: lastMessage
                ? {
                    id: lastMessage.id.toString(),
                    sender_id: lastMessage.sender_id.toString(),
                    body: lastMessage.body,
                    created_at: lastMessage.created_at,
                }
                : null,
        };
    });
}

export { getOrCreateConversation, getConversations };