import prisma from "../db/prisma.js";

const defaultMenu = [
    {
        name: "Home",
        url: "/profile",
    },
    {
        name: "About us",
        url: "/about",
    },
    {
        name: "Blog",
        url: "/blog",
        children: [
            { name: "Client Success", url: "" },
            { name: "5 greatest books", url: "" },
        ],
    },
    {
        name: "Partners",
        url: "/partners",
        children: [
            { name: "Proof", url: "" },
        ],
    },
    {
        name: "Contact Us",
        url: "/contact",
    },
    {
        name: "Chat",
        url: "/chat",
    },
];

function formatMenuItem(item) {
    return {
        id: item.id.toString(),
        name: item.name,
        url: item.url,
        sort_order: item.sort_order,
        parent_id: item.parent_id?.toString() || null,
    };
}

async function getMenu(userId) {
    const id = BigInt(userId);

    const user = await prisma.users.findUnique({
        where: { id },
        select: { menu_initialized: true },
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    if (user.menu_initialized) {
        const items = await prisma.menu_items.findMany({
            where: { user_id: id },
            orderBy: [{ sort_order: "asc" }, { id: "asc" }],
        });

        return items.map(formatMenuItem);
    }

    const items = await prisma.$transaction(
        async (tx) => {
            const result = await tx.users.updateMany({
                where: {
                    id,
                    menu_initialized: false,
                },
                data: {
                    menu_initialized: true,
                },
            });

            if (result.count === 1) {
                for (let index = 0; index < defaultMenu.length; index++) {
                    const item = defaultMenu[index];

                    const parent = await tx.menu_items.create({
                        data: {
                            user_id: id,
                            name: item.name,
                            url: item.url,
                            sort_order: index,
                            parent_id: null,
                        },
                    });

                    if (item.children) {
                        await tx.menu_items.createMany({
                            data: item.children.map((child, childIndex) => ({
                                user_id: id,
                                name: child.name,
                                url: child.url,
                                sort_order: childIndex,
                                parent_id: parent.id,
                            })),
                        });
                    }
                }
            }

            return tx.menu_items.findMany({
                where: {
                    user_id: id,
                },
                orderBy: [
                    { sort_order: "asc" },
                    { id: "asc" },
                ],
            });
        },
        {
            maxWait: 10000,
            timeout: 15000,
        }
    );

    return items.map(formatMenuItem);
}

async function addMenuItem(userId, { name, url = "" } = {}) {
    if (typeof name !== "string" || !name.trim()) {
        const error = new Error("Menu name is required");
        error.status = 400;
        throw error;
    }

    if (typeof url !== "string") {
        const error = new Error("URL must be a string");
        error.status = 400;
        throw error;
    }

    await getMenu(userId);

    const id = BigInt(userId);

    const item = await prisma.$transaction(
        async (tx) => {
            await tx.users.update({
                where: { id },
                data: {
                    menu_initialized: true,
                },
            });

            const lastItem = await tx.menu_items.findFirst({
                where: {
                    user_id: id,
                    parent_id: null,
                },
                orderBy: {
                    sort_order: "desc",
                },
            });

            return tx.menu_items.create({
                data: {
                    user_id: id,
                    name: name.trim(),
                    url: url.trim(),
                    parent_id: null,
                    sort_order: lastItem ? lastItem.sort_order + 1 : 0,
                },
            });
        },
        {
            maxWait: 10000,
            timeout: 15000,
        }
    );

    return formatMenuItem(item);
}

async function updateMenuItem(userId, itemId, { name, url = "" } = {}) {
    if (typeof name !== "string" || !name.trim()) {
        const error = new Error("Menu name is required");
        error.status = 400;
        throw error;
    }

    if (typeof url !== "string") {
        const error = new Error("URL must be a string");
        error.status = 400;
        throw error;
    }

    let id;

    try {
        id = BigInt(itemId);

        if (id <= 0n || id > 9223372036854775807n) {
            throw new Error();
        }
    } catch {
        const error = new Error("Invalid menu item ID");
        error.status = 400;
        throw error;
    }

    try {
        const item = await prisma.menu_items.update({
            where: {
                id,
                user_id: BigInt(userId),
            },
            data: {
                name: name.trim(),
                url: url.trim(),
            },
        });

        return formatMenuItem(item);
    } catch (error) {
        if (error.code === "P2025") {
            const notFoundError = new Error("Menu item not found");
            notFoundError.status = 404;
            throw notFoundError;
        }

        throw error;
    }
}

async function deleteMenuItem(userId, itemId) {
    let id;

    try {
        id = BigInt(itemId);

        if (id <= 0n || id > 9223372036854775807n) {
            throw new Error();
        }
    } catch {
        const error = new Error("Invalid menu item ID");
        error.status = 400;
        throw error;
    }

    const result = await prisma.menu_items.deleteMany({
        where: {
            id,
            user_id: BigInt(userId),
            other_menu_items: {
                none: {},
            },
        },
    });

    if (result.count === 0) {
        const item = await prisma.menu_items.findFirst({
            where: {
                id,
                user_id: BigInt(userId),
            },
            select: { id: true },
        });

        if (item) {
            const error = new Error(
                "Remove child items before removing this item"
            );
            error.status = 409;
            throw error;
        }

        const error = new Error("Menu item not found");
        error.status = 404;
        throw error;
    }
}

async function saveMenuOrder(userId, items) {
    if (!Array.isArray(items) || items.length > 500) {
        const error = new Error("Invalid menu");
        error.status = 400;
        throw error;
    }

    const id = BigInt(userId);

    const savedItems = await prisma.$transaction(
        async (tx) => {
            await tx.users.update({
                where: { id },
                data: {
                    menu_initialized: true,
                },
            });

            const currentItems = await tx.menu_items.findMany({
                where: {
                    user_id: id,
                },
            });

            const currentIds = new Set(
                currentItems.map((item) => item.id.toString())
            );

            const receivedItems = new Map();

            for (const item of items) {
                if (
                    !item ||
                    !currentIds.has(item.id) ||
                    receivedItems.has(item.id)
                ) {
                    const error = new Error("Invalid menu item");
                    error.status = 400;
                    throw error;
                }

                receivedItems.set(item.id, item);
            }

            if (receivedItems.size !== currentIds.size) {
                const error = new Error(
                    "Menu has changed. Refresh and try again."
                );
                error.status = 409;
                throw error;
            }

            for (const item of items) {
                const visited = new Set([item.id]);
                let parentId = item.parent_id;

                while (parentId !== null) {
                    if (
                        !receivedItems.has(parentId) ||
                        visited.has(parentId)
                    ) {
                        const error = new Error(
                            "Invalid parent relationship"
                        );
                        error.status = 400;
                        throw error;
                    }

                    visited.add(parentId);

                    parentId =
                        receivedItems.get(parentId).parent_id;
                }
            }

            const positions = new Map();

            for (const item of items) {
                const position =
                    positions.get(item.parent_id) || 0;

                await tx.menu_items.update({
                    where: {
                        id: BigInt(item.id),
                    },
                    data: {
                        parent_id:
                            item.parent_id === null
                                ? null
                                : BigInt(item.parent_id),
                        sort_order: position,
                    },
                });

                positions.set(item.parent_id, position + 1);
            }

            return tx.menu_items.findMany({
                where: {
                    user_id: id,
                },
                orderBy: [
                    { sort_order: "asc" },
                    { id: "asc" },
                ],
            });
        },
        {
            maxWait: 10000,
            timeout: 15000,
        }
    );

    return savedItems.map(formatMenuItem);
}

export { getMenu, addMenuItem, updateMenuItem, deleteMenuItem, saveMenuOrder };