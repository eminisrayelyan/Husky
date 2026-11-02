import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import penIcon from "../../assets/edit.png";
import downIcon from "../../assets/down.png";
import styles from "./Header.module.css";

function MenuItem({ item, items }) {
    const children = items
        .filter((child) => child.parent_id === item.id)
        .sort((a, b) => a.sort_order - b.sort_order);

    const url = item.url || "";

    const hasLink =
        (url.startsWith("/") && !url.startsWith("//")) ||
        url.startsWith("https://") ||
        url.startsWith("http://");

    return (
        <li className={styles.menuItem}>
            {hasLink ? (
                <Link to={url}>
                    {item.name}
                    {children.length > 0 && (<img src={downIcon} alt="" className={styles.downIcon} />)}
                </Link>
            ) : (
                <button
                    type="button"
                    className={styles.menuButton}
                >
                    {item.name}
                    {children.length > 0 && (<img src={downIcon} alt="" className={styles.downIcon} />)}
                </button>
            )}

            {children.length > 0 && (
                <ul className={styles.dropdown}>
                    {children.map((child) => (
                        <MenuItem
                            key={child.id}
                            item={child}
                            items={items}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

function Header() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadMenu() {
            try {
                const response = await fetch("/api/menu", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error("Could not load menu");
                }

                const data = await response.json();

                if (!controller.signal.aborted) {
                    setItems(data.items);
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
    }, []);

    const mainItems = items
        .filter((item) => item.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order);

    return (
        <header className={styles.header}>
            <nav className={styles.nav} aria-label="Main navigation">
                <ul className={styles["nav-list"]}>
                    {loading && <li>Loading menu...</li>}
                    {error && <li role="alert">{error}</li>}

                    {mainItems.map((item) => (
                        <MenuItem
                            key={item.id}
                            item={item}
                            items={items}
                        />
                    ))}

                    <li>
                        <Link
                            to="/menu/edit"
                            className={styles["edit-menu-btn"]}
                        >
                            <img src={penIcon} alt="Edit menu" />
                        </Link>
                    </li>
                </ul>
            </nav>
        </header>
    );
}

export default Header;