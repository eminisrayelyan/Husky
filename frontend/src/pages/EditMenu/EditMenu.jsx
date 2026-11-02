import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import arrowIcon from "../../assets/arrow.png";
import styles from "./EditMenu.module.css";

function formatItem(item) {
    return {
        ...item,
        parentId: item.parent_id,
    };
}

function isInside(items, itemId, parentId) {
    let item = items.find((item) => item.id === itemId);

    while (item) {
        if (item.id === parentId) {
            return true;
        }

        item = items.find((parent) => parent.id === item.parentId);
    }

    return false;
}

function MenuList({
    items,
    parentId,
    disabled,
    onDragStart,
    onDragEnd,
    onMove,
    onRemove,
}) {
    const currentItems = items.filter(
        (item) => item.parentId === parentId
    );

    function allowDrop(event) {
        event.stopPropagation();

        if (!disabled) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
        }
    }

    function dropBetween(event, beforeId = null) {
        event.preventDefault();
        event.stopPropagation();

        if (disabled) return;

        onMove(parentId, beforeId);
    }

    function dropOnItem(event, item, index) {
        event.preventDefault();
        event.stopPropagation();

        if (disabled) return;

        const row = event.currentTarget.getBoundingClientRect();
        const mouseX = event.clientX - row.left;
        const mouseY = event.clientY - row.top;

        if (mouseX > row.width * 0.7) {
            onMove(item.id);
        } else if (mouseY < row.height / 2) {
            onMove(parentId, item.id);
        } else {
            const nextItem = currentItems[index + 1];

            onMove(parentId, nextItem?.id || null);
        }
    }

    return (
        <ul
            className={
                parentId === null
                    ? styles.menuList
                    : styles.childList
            }
        >
            {currentItems.map((item, index) => (
                <li key={item.id}>
                    <div
                        className={styles.dropSpace}
                        onDragOver={allowDrop}
                        onDrop={(event) =>
                            dropBetween(event, item.id)
                        }
                    />

                    <div
                        className={styles.row}
                        onDragOver={allowDrop}
                        onDrop={(event) =>
                            dropOnItem(event, item, index)
                        }
                    >
                        <span
                            className={styles.handle}
                            draggable={!disabled}
                            title="Drag to move"
                            onDragStart={(event) =>
                                onDragStart(event, item.id)
                            }
                            onDragEnd={onDragEnd}
                        >
                            ☰
                        </span>

                        <span className={styles.itemName}>
                            {item.name}
                        </span>

                        <button
                            type="button"
                            className={styles.removeButton}
                            aria-label={`Remove ${item.name}`}
                            disabled={disabled}
                            onClick={() => onRemove(item.id)}
                        >
                            ×
                        </button>
                    </div>

                    {items.some(
                        (child) => child.parentId === item.id
                    ) && (
                            <MenuList
                                items={items}
                                parentId={item.id}
                                disabled={disabled}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onMove={onMove}
                                onRemove={onRemove}
                            />
                        )}
                </li>
            ))}

            <li
                className={styles.dropSpace}
                onDragOver={allowDrop}
                onDrop={(event) => dropBetween(event)}
            />
        </ul>
    );
}

function EditMenu() {
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState([]);
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [draggedId, setDraggedId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);
    const [error, setError] = useState("");

    const busy = loading || adding || deleting || savingOrder;

    useEffect(() => {
        const controller = new AbortController();

        async function loadMenu() {
            try {
                const response = await fetch("/api/menu", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                if (!response.ok) {
                    throw new Error("Could not load menu");
                }

                const data = await response.json();

                if (!controller.signal.aborted) {
                    setMenuItems(data.items.map(formatItem));
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadMenu();

        return () => controller.abort();
    }, [navigate]);

    async function handleAdd(event) {
        event.preventDefault();

        if (busy || !name.trim()) return;

        setAdding(true);
        setError("");

        try {
            const response = await fetch("/api/menu", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: name.trim(),
                    url: url.trim(),
                }),
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not add menu item"
                );
            }

            setMenuItems((previous) => [
                ...previous,
                formatItem(data.item),
            ]);

            setName("");
            setUrl("");
        } catch (error) {
            setError(error.message);
        } finally {
            setAdding(false);
        }
    }

    async function handleRemove(itemId) {
        if (busy) return;

        setDeleting(true);
        setError("");

        try {
            const response = await fetch(`/api/menu/${itemId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not delete menu item"
                );
            }

            setMenuItems((previous) =>
                previous.filter(
                    (item) => !isInside(previous, item.id, itemId)
                )
            );
        } catch (error) {
            setError(error.message);
        } finally {
            setDeleting(false);
        }
    }

    function handleDragStart(event, itemId) {
        event.dataTransfer.setData("text/plain", itemId);
        event.dataTransfer.effectAllowed = "move";

        setDraggedId(itemId);
    }

    async function handleMove(parentId, beforeId = null) {
        if (busy || !draggedId) return;

        if (
            draggedId === beforeId ||
            isInside(menuItems, parentId, draggedId)
        ) {
            setDraggedId(null);
            return;
        }

        const draggedItem = menuItems.find(
            (item) => item.id === draggedId
        );

        if (!draggedItem) return;

        const previousItems = menuItems;

        const updatedItems = menuItems.filter(
            (item) => item.id !== draggedId
        );

        const movedItem = {
            ...draggedItem,
            parentId,
        };

        if (beforeId === null) {
            updatedItems.push(movedItem);
        } else {
            const index = updatedItems.findIndex(
                (item) => item.id === beforeId
            );

            if (index === -1) return;

            updatedItems.splice(index, 0, movedItem);
        }

        setMenuItems(updatedItems);
        setDraggedId(null);
        setSavingOrder(true);
        setError("");

        try {
            const response = await fetch("/api/menu/order", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    items: updatedItems.map((item) => ({
                        id: item.id,
                        parent_id: item.parentId,
                    })),
                }),
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not save menu order"
                );
            }

            setMenuItems(data.items.map(formatItem));
        } catch (error) {
            setMenuItems(previousItems);
            setError(error.message);
        } finally {
            setSavingOrder(false);
        }
    }

    return (
        <main className={styles.page} aria-label="Edit menu">
            <div className={styles.panel}>
                <form
                    className={styles.sidebar}
                    onSubmit={handleAdd}
                >
                    <Link
                        to="/profile"
                        className={styles.backButton}
                    >
                        <img src={arrowIcon} alt="" />
                        Back
                    </Link>

                    <div className={styles.field}>
                        <label htmlFor="menu-name">*Name</label>

                        <input
                            id="menu-name"
                            type="text"
                            value={name}
                            disabled={busy}
                            onChange={(event) =>
                                setName(event.target.value)
                            }
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="menu-url">URL</label>

                        <input
                            id="menu-url"
                            type="text"
                            value={url}
                            disabled={busy}
                            onChange={(event) =>
                                setUrl(event.target.value)
                            }
                        />
                    </div>

                    <button
                        type="submit"
                        className={styles.addButton}
                        disabled={busy || !name.trim()}
                    >
                        {adding ? "Adding..." : "Add"}
                        <span aria-hidden="true">›</span>
                    </button>
                </form>

                <section
                    className={styles.menu}
                    aria-label="Menu items"
                >
                    {loading && <p>Loading menu...</p>}
                    {deleting && <p>Deleting item...</p>}
                    {savingOrder && <p>Saving menu...</p>}
                    {error && <p role="alert">{error}</p>}

                    <MenuList
                        items={menuItems}
                        parentId={null}
                        disabled={busy}
                        onDragStart={handleDragStart}
                        onDragEnd={() => setDraggedId(null)}
                        onMove={handleMove}
                        onRemove={handleRemove}
                    />
                </section>
            </div>
        </main>
    );
}

export default EditMenu;