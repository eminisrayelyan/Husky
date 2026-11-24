import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import socket from "../../socket.js";
import styles from "./Chat.module.css";
import searchIcon from "../../assets/search.png";

function getFullName(user) {
    return `${user.first_name} ${user.last_name}`;
}

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

function Contact({ user, selected, preview, unreadCount, onSelect }) {
    function handleKeyDown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(user);
        }
    }

    return (
        <li
            className={selected ? `${styles.contact} ${styles.selected}` : styles.contact}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(user)}
            onKeyDown={handleKeyDown}
        >
            <Avatar user={user} />

            <div className={styles.contactText}>
                <span className={styles.contactName}>{getFullName(user)}</span>
                <span className={styles.preview}>{preview || ""}</span>
            </div>

            {unreadCount > 0 && (
                <span className={styles.badge} aria-label={`${unreadCount} unread messages`}>
                    {unreadCount}
                </span>
            )}
        </li>
    );
}

function ChatMessage({ message, isMine, currentUser, selectedUser }) {
    return (
        <li className={isMine ? `${styles.message} ${styles.outgoing}` : styles.message}>
            {!isMine && <Avatar user={selectedUser} />}
            <p className={styles.bubble}>{message.body}</p>
            {isMine && <Avatar user={currentUser} />}
        </li>
    );
}

function Chat() {
    const navigate = useNavigate();
    const threadRef = useRef(null);
    const pendingUnreadRef = useRef([]);
    const unreadLoadedRef = useRef(false);

    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [conversationId, setConversationId] = useState(null);

    const [messages, setMessages] = useState([]);
    const [lastMessages, setLastMessages] = useState({});
    const [unreadCounts, setUnreadCounts] = useState({});

    const [search, setSearch] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const [loading, setLoading] = useState(true);
    const [opening, setOpening] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const thread = threadRef.current;

        if (thread) {
            thread.scrollTop = thread.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        function handleNewMessage(data) {
            const newMessage = data.message;

            if (!unreadLoadedRef.current) {
                pendingUnreadRef.current.push(newMessage);
            }

            setUnreadCounts((previous) => ({
                ...previous,
                [newMessage.sender_id]: (previous[newMessage.sender_id] || 0) + 1,
            }));

            setLastMessages((previous) => ({
                ...previous,
                [newMessage.sender_id]: newMessage.body,
            }));

            if (newMessage.conversation_id !== conversationId) {
                return;
            }

            setMessages((previous) => {
                if (previous.some((item) => item.id === newMessage.id)) {
                    return previous;
                }

                return [...previous, newMessage];
            });
        }

        socket.on("new-message", handleNewMessage);

        return () => socket.off("new-message", handleNewMessage);
    }, [conversationId]);

    useEffect(() => {
        if (!conversationId || !selectedUser || opening || messages.length === 0) {
            return;
        }

        let cancelled = false;

        async function markAsRead() {
            if (document.hidden) {
                return;
            }

            try {
                const response = await fetch(`/api/conversations/${conversationId}/read`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ lastMessageId: messages[messages.length - 1].id }),
                });

                if (response.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }
                if (!response.ok) {
                    throw new Error("Could not mark messages as read");
                }

                const data = await response.json();
                if (!cancelled) {
                    setUnreadCounts((previous) => ({
                        ...previous,
                        [selectedUser.id]: data.unread_count,
                    }));
                }
            } catch (error) {
                if (!cancelled) {
                    setError(error.message);
                }
            }
        }

        markAsRead();
        document.addEventListener("visibilitychange", markAsRead);

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", markAsRead);
        };
    }, [conversationId, selectedUser, opening, messages, navigate]);

    useEffect(() => {
        const controller = new AbortController();

        async function loadChat() {
            try {
                const options = {
                    credentials: "include",
                    signal: controller.signal,
                };

                const [profileResponse, usersResponse, conversationsResponse] = await Promise.all([
                    fetch("/api/users/profile", options),
                    fetch("/api/users", options),
                    fetch("/api/conversations", options),
                ]);

                if (profileResponse.status === 401 || usersResponse.status === 401 || conversationsResponse.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                if (!profileResponse.ok) {
                    throw new Error("Could not load your profile");
                }

                const profileData = await profileResponse.json();

                if (!usersResponse.ok) {
                    throw new Error("Could not load users");
                }

                const usersData = await usersResponse.json();

                if (!conversationsResponse.ok) {
                    throw new Error("Could not load conversation previews");
                }

                const conversationsData =
                    await conversationsResponse.json();

                const previews = {};
                const counts = {};
                const lastIds = {};

                for (const conversation of conversationsData.conversations) {
                    const userId = conversation.other_user.id;
                    previews[userId] = conversation.last_message?.body || "";
                    counts[userId] = conversation.unread_count;
                    lastIds[userId] = conversation.last_message?.id || "0";
                }

                if (controller.signal.aborted) {
                    return;
                }

                for (const message of pendingUnreadRef.current) {
                    if (BigInt(message.id) > BigInt(lastIds[message.sender_id] || "0")) {
                        counts[message.sender_id] = (counts[message.sender_id] || 0) + 1;
                    }
                }
                pendingUnreadRef.current = [];
                unreadLoadedRef.current = true;

                setCurrentUser(profileData.user);
                setUsers(usersData.users);
                setUnreadCounts(counts);
                setLastMessages((previous) => ({ ...previews, ...previous }));
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
        if (opening || sending) {
            return;
        }

        const previewBeforeLoading = lastMessages[user.id];

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

            setConversationId(id);

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

            setMessages((previous) => {
                const newMessages = previous.filter(
                    (item) => !messagesData.messages.some(
                        (savedItem) => savedItem.id === item.id
                    )
                );

                return [...messagesData.messages, ...newMessages];
            });

            const lastMessage =
                messagesData.messages[messagesData.messages.length - 1];

            setLastMessages((previous) => {
                if (previous[user.id] !== previewBeforeLoading) {
                    return previous;
                }

                return {
                    ...previous,
                    [user.id]: lastMessage?.body || "",
                };
            });
        } catch (error) {
            setConversationId(null);
            setError(error.message);
        } finally {
            setOpening(false);
        }
    }

    async function handleSend(event) {
        event.preventDefault();

        const body = message.trim();

        if (!body || !conversationId || sending || opening) {
            return;
        }

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
        if (!currentUser) {
            return;
        }

        const details = [getFullName(currentUser), currentUser.email];

        if (currentUser.phone_number) {
            details.push(currentUser.phone_number);
        }

        setMessage(details.join(", "));
    }

    const searchText = search.trim().toLowerCase();
    const filteredUsers = users.filter((user) =>
        getFullName(user)
            .toLowerCase()
            .includes(searchText)
    );

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
                                <Contact
                                    key={user.id}
                                    user={user}
                                    selected={selectedUser?.id === user.id}
                                    preview={lastMessages[user.id]}
                                    unreadCount={unreadCounts[user.id]}
                                    onSelect={handleSelectUser}
                                />
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

                                    <h2>{getFullName(selectedUser)}</h2>
                                </header>

                                <ul className={styles.thread} ref={threadRef}>
                                    {opening && (
                                        <li>Loading messages...</li>
                                    )}

                                    {!opening &&
                                        conversationId &&
                                        messages.length === 0 && (
                                            <li>No messages yet.</li>
                                        )}

                                    {messages.map((item) => (
                                        <ChatMessage
                                            key={item.id}
                                            message={item}
                                            isMine={item.sender_id === currentUser?.id}
                                            currentUser={currentUser}
                                            selectedUser={selectedUser}
                                        />
                                    ))}
                                </ul>

                                <form
                                    className={styles.composer}
                                    onSubmit={handleSend}
                                >
                                    <div className={styles.composerRow}>
                                        <input
                                            type="text"
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
