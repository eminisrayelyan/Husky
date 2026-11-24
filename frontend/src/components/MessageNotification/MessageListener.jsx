import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import socket from "../../socket.js";
import MessageNotification from "./MessageNotification.jsx";

function MessageListener() {
    const location = useLocation();
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        setNotification(null);

        const privatePage = ["/profile", "/chat", "/menu/edit"].includes(location.pathname);

        if (!privatePage) {
            return;
        }

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

        socket.connect();

        return () => {
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