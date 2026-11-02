import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import styles from "./Chat.module.css";
import searchIcon from "../../assets/search.png";

function getInitials(user) {
    const first = user?.first_name?.[0] || "";
    const last = user?.last_name?.[0] || "";

    return (first + last).toUpperCase() || "U";
}

function Avatar({ user }) {
    return (
        <span className={styles.avatar}>
            {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" />
            ) : (
                getInitials(user)
            )}
        </span>
    );
}

function Chat() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [conversationId, setConversationId] = useState(null);

    const [messages, setMessages] = useState([]);
    const [lastMessages, setLastMessages] = useState({});

    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadChat() {
            try {
                const profileResponse = await fetch("/api/users/profile", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (profileResponse.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                if (!profileResponse.ok) {
                    throw new Error("Could not load your profile");
                }

                const profileData = await profileResponse.json();

                const usersResponse = await fetch("/api/users", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (usersResponse.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                if (!usersResponse.ok) {
                    throw new Error("Could not load users");
                }

                const usersData = await usersResponse.json();

                const conversationsResponse = await fetch(
                    "/api/conversations",
                    {
                        credentials: "include",
                        signal: controller.signal,
                    }
                );

                if (conversationsResponse.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                if (!conversationsResponse.ok) {
                    throw new Error("Could not load conversation previews");
                }

                const conversationsData =
                    await conversationsResponse.json();

                const previews = {};

                for (const conversation of conversationsData.conversations) {
                    previews[conversation.other_user.id] =
                        conversation.last_message?.body || "";
                }

                if (controller.signal.aborted) return;

                setCurrentUser(profileData.user);
                setUsers(usersData.users);
                setLastMessages(previews);
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

        loadChat();

        return () => controller.abort();
    }, [navigate]);

    async function handleSelectUser(user) {
        if (opening || sending) return;

        setOpening(true);
        setError("");
        setSelectedUser(user);
        setConversationId(null);
        setMessages([]);
        setMessage("");

        try {
            const response = await fetch("/api/conversations", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    otherUserId: user.id,
                }),
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            if (!response.ok) {
                throw new Error("Could not open conversation");
            }

            const data = await response.json();
            const id = data.conversation.id;

            const messagesResponse = await fetch(
                `/api/conversations/${id}/messages`,
                {
                    credentials: "include",
                }
            );

            if (messagesResponse.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            if (!messagesResponse.ok) {
                throw new Error("Could not load messages");
            }

            const messagesData = await messagesResponse.json();

            setConversationId(id);
            setMessages(messagesData.messages);

            const lastMessage =
                messagesData.messages[messagesData.messages.length - 1];

            setLastMessages((previous) => ({
                ...previous,
                [user.id]: lastMessage?.body || "",
            }));
        } catch (error) {
            setError(error.message);
        } finally {
            setOpening(false);
        }
    }

    async function handleSend(event) {
        event.preventDefault();

        const body = message.trim();

        if (!body || !conversationId || sending || opening) return;

        setSending(true);
        setError("");

        try {
            const response = await fetch(
                `/api/conversations/${conversationId}/messages`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ body }),
                }
            );

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not send message"
                );
            }

            setMessages((previous) => [...previous, data.message]);

            setLastMessages((previous) => ({
                ...previous,
                [selectedUser.id]: data.message.body,
            }));

            setMessage("");
        } catch (error) {
            setError(error.message);
        } finally {
            setSending(false);
        }
    }

    function handleShareAccountDetails() {
        if (!currentUser) return;

        const fullName =
            `${currentUser.first_name} ${currentUser.last_name}`;

        const details = [fullName, currentUser.email];

        if (currentUser.phone_number) {
            details.push(currentUser.phone_number);
        }

        setMessage(details.join(", "));
    }

    const filteredUsers = users.filter((user) => {
        const fullName = `${user.first_name} ${user.last_name}`;

        return fullName
            .toLowerCase()
            .includes(search.trim().toLowerCase());
    });

    const composerDisabled = opening || sending || !conversationId;

    return (
        <div className={styles.page}>
            <Header />

            <main className={styles.main}>
                <div className={styles.panel}>
                    <aside className={styles.sidebar}>
                        <h1>Messages</h1>

                        <div className={styles.search}>
                            <input
                                type="search"
                                aria-label="Search users"
                                placeholder="Search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />

                            <img
                                src={searchIcon}
                                className={styles.searchIcon}
                                alt=""
                            />
                        </div>

                        {loading && <p>Loading users...</p>}

                        <ul className={styles.contacts}>
                            {filteredUsers.map((user) => (
                                <li
                                    key={user.id}
                                    className={
                                        selectedUser?.id === user.id
                                            ? `${styles.contact} ${styles.selected}`
                                            : styles.contact
                                    }
                                    role="button"
                                    tabIndex={0}
                                    aria-disabled={opening || sending}
                                    onClick={() => handleSelectUser(user)}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" ||
                                            event.key === " "
                                        ) {
                                            event.preventDefault();
                                            handleSelectUser(user);
                                        }
                                    }}
                                >
                                    <Avatar user={user} />

                                    <div className={styles.contactText}>
                                        <span className={styles.contactName}>
                                            {user.first_name} {user.last_name}
                                        </span>

                                        <span className={styles.preview}>
                                            {lastMessages[user.id] || ""}
                                        </span>
                                    </div>
                                </li>
                            ))}

                            {!loading &&
                                !error &&
                                filteredUsers.length === 0 && (
                                    <li className={styles.contact}>
                                        No users found.
                                    </li>
                                )}
                        </ul>
                    </aside>

                    <section className={styles.conversation}>
                        {error && <p role="alert">{error}</p>}

                        {selectedUser ? (
                            <>
                                <header
                                    className={styles.conversationHeader}
                                >
                                    <Avatar user={selectedUser} />

                                    <h2>
                                        {selectedUser.first_name}{" "}
                                        {selectedUser.last_name}
                                    </h2>
                                </header>

                                <ul className={styles.thread}>
                                    {opening && (
                                        <li>Loading messages...</li>
                                    )}

                                    {!opening &&
                                        conversationId &&
                                        messages.length === 0 && (
                                            <li>No messages yet.</li>
                                        )}

                                    {messages.map((item) => {
                                        const isMine =
                                            item.sender_id === currentUser?.id;

                                        return (
                                            <li
                                                key={item.id}
                                                className={
                                                    isMine
                                                        ? `${styles.message} ${styles.outgoing}`
                                                        : styles.message
                                                }
                                            >
                                                {!isMine && (
                                                    <Avatar
                                                        user={selectedUser}
                                                    />
                                                )}

                                                <p className={styles.bubble}>
                                                    {item.body}
                                                </p>

                                                {isMine && (
                                                    <Avatar
                                                        user={currentUser}
                                                    />
                                                )}
                                            </li>
                                        );
                                    })}
                                </ul>

                                <form
                                    className={styles.composer}
                                    onSubmit={handleSend}
                                >
                                    <div className={styles.composerRow}>
                                        <input
                                            type="text"
                                            aria-label="Message"
                                            placeholder="Type something..."
                                            maxLength={2000}
                                            value={message}
                                            disabled={composerDisabled}
                                            onChange={(event) =>
                                                setMessage(event.target.value)
                                            }
                                        />

                                        <button
                                            type="submit"
                                            disabled={
                                                composerDisabled ||
                                                !message.trim()
                                            }
                                        >
                                            {sending ? "Sending..." : "SEND"}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        className={styles.shareButton}
                                        onClick={handleShareAccountDetails}
                                        disabled={
                                            composerDisabled || !currentUser
                                        }
                                    >
                                        Share my account details
                                    </button>
                                </form>
                            </>
                        ) : (
                            <p style={{ margin: "30px" }}>Select a user to start chatting.</p>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}

export default Chat;