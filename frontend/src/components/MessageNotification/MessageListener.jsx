import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { io } from "socket.io-client";
import MessageNotification from "./MessageNotification.jsx";

function MessageListener() {
    const location = useLocation();
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const controller = new AbortController();

        const socketUrl = import.meta.env.DEV
            ? "http://localhost:3000"
            : window.location.origin;

        const socket = io(socketUrl, {
            withCredentials: true,
            autoConnect: false,
        });

        setNotification(null);

        socket.on("new-message", (data) => {
            setNotification({
                senderName: data.senderName,
            });
        });

        socket.on("connect_error", (error) => {
            console.error("Notification connection failed:", error.message);
        });

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
            socket.disconnect();
            socket.removeAllListeners();
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