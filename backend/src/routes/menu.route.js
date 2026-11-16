import { Router } from "express";
import requireAuth from "../middleware/requireAuth.js";
import { getMenuController, addMenuItemController, updateMenuItemController, deleteMenuItemController, saveMenuOrderController } from "../controllers/menu.controller.js";

const router = Router();

router.get("/", requireAuth, getMenuController);
router.post("/", requireAuth, addMenuItemController);
router.patch("/order", requireAuth, saveMenuOrderController);
router.patch("/:itemId", requireAuth, updateMenuItemController);
router.delete("/:itemId", requireAuth, deleteMenuItemController);

export default router;
