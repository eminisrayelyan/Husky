import { getOrCreateConversation, getConversations } from "../services/conversation.service.js";

async function createConversationController(req, res, next) {
    try {
        const { otherUserId } = res.locals.conversationData;

        const conversation = await getOrCreateConversation(
            req.session.userId,
            otherUserId
        );

        return res.status(200).json({
            conversation,
        });
    } catch (error) {
        next(error);
    }
}

async function getConversationsController(req, res, next) {
    try {
        const conversations = await getConversations(req.session.userId);

        return res.status(200).json({ conversations });
    } catch (error) {
        next(error);
    }
}

export { createConversationController, getConversationsController  };