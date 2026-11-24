import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import validateConversation from "../middleware/validateConversation.js";
import { createConversationController, getConversationsController } from "../controllers/conversation.controller.js";
import validateMessage from "../middleware/validateMessage.js";
import { sendMessageController, getMessagesController, markMessagesReadController } from "../controllers/message.controller.js";

const router = Router();

router.post("/", requireAuth, validateConversation, createConversationController);
router.post("/:conversationId/messages", requireAuth, validateMessage, sendMessageController);
router.get("/:conversationId/messages", requireAuth, getMessagesController);
router.patch("/:conversationId/read", requireAuth, markMessagesReadController);
router.get("/", requireAuth, getConversationsController);

export default router;
