import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";

function ForgotPassword() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) {
            return;
        }

        const formData = new FormData(event.currentTarget);
        const email = formData.get("email");

        setMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setMessage(
                    data?.message ||
                    data?.errors?.[0]?.message ||
                    "Could not send reset email"
                );
                return;
            }

            setMessage(data?.message || "Check your email for a reset link.");
        } catch {
            setMessage("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1>FORGOT PASSWORD</h1>

            <div className={styles["inputs-wrapper"]}>
                <div className={styles["input-wrapper"]}>
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="email"
                        className={styles.input}
                        required
                    />
                </div>
            </div>

            {message && <p role="status">{message}</p>}

            <div className={styles["btn-wrapper"]}>
                <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                >
                    {loading ? "Sending..." : "Send"}
                </button>

                <Link to="/" className={styles["sign-in"]}>
                    SIGN IN
                </Link>
            </div>
        </form>
    );
}

export default ForgotPassword;