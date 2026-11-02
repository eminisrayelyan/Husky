import { getMenu, addMenuItem, deleteMenuItem, saveMenuOrder } from "../services/menu.service.js";
async function getMenuController(req, res, next) {
    try {
        const items = await getMenu(req.session.userId);

        return res.status(200).json({ items });
    } catch (error) {
        next(error);
    }
}

async function addMenuItemController(req, res, next) {
    try {
        const item = await addMenuItem(
            req.session.userId,
            req.body
        );

        return res.status(201).json({
            message: "Menu item added successfully",
            item,
        });
    } catch (error) {
        next(error);
    }
}

async function deleteMenuItemController(req, res, next) {
    try {
        await deleteMenuItem(
            req.session.userId,
            req.params.itemId
        );

        return res.status(200).json({
            message: "Menu item deleted successfully",
        });
    } catch (error) {
        next(error);
    }
}

async function saveMenuOrderController(req, res, next) {
    try {
        const items = await saveMenuOrder(
            req.session.userId,
            req.body?.items
        );

        return res.status(200).json({
            message: "Menu order saved successfully",
            items,
        });
    } catch (error) {
        next(error);
    }
}

export { getMenuController, addMenuItemController, deleteMenuItemController, saveMenuOrderController };