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
    onEdit,
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
            {currentItems.map((item, index) => {
                const hasChildren = items.some(
                    (child) => child.parentId === item.id
                );

                return (
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
                                className={styles.editButton}
                                aria-label={`Edit ${item.name}`}
                                disabled={disabled}
                                onClick={() => onEdit(item)}
                            >
                                Edit
                            </button>

                            <button
                                type="button"
                                className={styles.removeButton}
                                aria-label={`Remove ${item.name}`}
                                disabled={disabled || hasChildren}
                                title={hasChildren ? "Remove child items first" : undefined}
                                onClick={() => onRemove(item.id)}
                            >
                                ×
                            </button>
                        </div>

                        {hasChildren && (
                            <MenuList
                                items={items}
                                parentId={item.id}
                                disabled={disabled}
                                onDragStart={onDragStart}
                                onDragEnd={onDragEnd}
                                onMove={onMove}
                                onEdit={onEdit}
                                onRemove={onRemove}
                            />
                        )}
                    </li>
                );
            })}

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
    const [nameError, setNameError] = useState("");
    const [url, setUrl] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [draggedId, setDraggedId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [savingOrder, setSavingOrder] = useState(false);
    const [error, setError] = useState("");

    const busy = loading || saving || deleting || savingOrder;
    const submitLabel = editingId ? "Save" : "Add";

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

    function handleEdit(item) {
        if (busy) return;

        setEditingId(item.id);
        setName(item.name);
        setUrl(item.url);
        setNameError("");
        setError("");
    }

    function resetForm() {
        setEditingId(null);
        setName("");
        setUrl("");
        setNameError("");
        setError("");
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (busy) return;

        if (!name.trim()) {
            setNameError("Name is required");
            return;
        }

        setNameError("");

        setSaving(true);
        setError("");

        try {
            const endpoint = editingId ? `/api/menu/${editingId}` : "/api/menu";

            const response = await fetch(endpoint, {
                method: editingId ? "PATCH" : "POST",
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
                    data.message || "Could not save menu item"
                );
            }

            const savedItem = formatItem(data.item);

            if (editingId) {
                setMenuItems((previous) =>
                    previous.map((item) =>
                        item.id === editingId ? savedItem : item
                    )
                );
            } else {
                setMenuItems((previous) => [...previous, savedItem]);
            }

            resetForm();
        } catch (error) {
            setError(error.message);
        } finally {
            setSaving(false);
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

            if (editingId === itemId) {
                resetForm();
            }

            setMenuItems((previous) =>
                previous.filter(
                    (item) => item.id !== itemId
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
                    onSubmit={handleSubmit}
                    noValidate
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
                            onChange={(event) => {
                                setName(event.target.value);
                                if (event.target.value.trim()) {
                                    setNameError("");
                                }
                            }}
                            aria-invalid={Boolean(nameError)}
                            aria-describedby={nameError ? "menu-name-error" : undefined}
                            required
                        />

                        {nameError && (
                            <p id="menu-name-error" className={styles.fieldError} role="alert">
                                {nameError}
                            </p>
                        )}
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
                        disabled={busy}
                    >
                        {saving ? "Saving..." : submitLabel}
                        <span aria-hidden="true">›</span>
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className={styles.cancelButton}
                            disabled={busy}
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    )}
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
                        onEdit={handleEdit}
                        onRemove={handleRemove}
                    />
                </section>
            </div>
        </main>
    );
}

export default EditMenu;
