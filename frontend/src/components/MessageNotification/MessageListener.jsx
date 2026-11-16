import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import socket from "../../socket.js";
import MessageNotification from "./MessageNotification.jsx";

function MessageListener() {
    const location = useLocation();
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        setNotification(null);

        function handleNewMessage(data) {
            setNotification({
                senderName: data.senderName,
            });
        }

        function handleConnectError(error) {
            console.error("Notification connection failed:", error.message);
        }

        socket.on("new-message", handleNewMessage);
        socket.on("connect_error", handleConnectError);

        async function connectNotifications() {
            try {
                const response = await fetch("/api/users/profile", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (!response.ok || controller.signal.aborted) {
                    return;
                }

                socket.connect();
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Could not connect notifications:", error);
                }
            }
        }

        connectNotifications();

        return () => {
            controller.abort();
            socket.off("new-message", handleNewMessage);
            socket.off("connect_error", handleConnectError);
            socket.disconnect();
        };
    }, [location.pathname]);

    return (
        <MessageNotification
            notification={notification}
            onClose={() => setNotification(null)}
        />
    );
}

export default MessageListener;
