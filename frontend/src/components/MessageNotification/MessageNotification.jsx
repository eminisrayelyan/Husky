import { useNavigate } from "react-router-dom";
import styles from "./MessageNotification.module.css";
import icon from "../../assets/vector.png";

function MessageNotification({ notification, onClose }) {
    const navigate = useNavigate();

    if (!notification) {
        return null;
    }

    function handleOpenChat() {
        navigate("/chat");
        onClose();
    }

    return (
        <div className={styles.notification} role="status">
            <button
                type="button"
                className={styles.content}
                onClick={handleOpenChat}
            >
                <img src={icon} alt="chat" className={styles.icon} />
                <span>
                    You have a message from {notification.senderName}
                </span>
            </button>

            <button
                type="button"
                className={styles.close}
                onClick={onClose}
            >
                ×
            </button>
        </div>
    );
}

export default MessageNotification;