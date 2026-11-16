import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./ForgotPassword.module.css";

function ForgotPassword() {
    const [message, setMessage] = useState("");
    const [emailError, setEmailError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleInputChange(event) {
        const input = event.currentTarget;

        if (input.value.trim() !== "" && input.validity.valid) {
            setEmailError("");
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) {
            return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);
        const email = formData.get("email");

        setMessage("");
        setEmailError("");

        if (!email.trim()) {
            setEmailError("Email is required");
            return;
        }

        if (!form.elements.email.validity.valid) {
            setEmailError("Enter a valid email address");
            return;
        }

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
                const emailIssue = data?.errors?.find((issue) => issue.field === "email");

                if (emailIssue) {
                    setEmailError(emailIssue.message);
                } else {
                    setMessage(
                        data?.message ||
                        data?.errors?.[0]?.message ||
                        "Could not send reset email"
                    );
                }

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
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <h1>FORGOT PASSWORD</h1>

            <div className={styles["inputs-wrapper"]}>
                <div className={styles["input-wrapper"]}>
                    <label htmlFor="email">Email Address</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        autoComplete="email"
                        onChange={handleInputChange}
                        className={`${styles.input} ${emailError ? styles["input-error"] : ""}`}
                        aria-invalid={Boolean(emailError)}
                        aria-describedby={emailError ? "email-error" : undefined}
                        required
                    />

                    {emailError && (
                        <p
                            id="email-error"
                            className={styles["field-error"]}
                            role="alert"
                        >
                            {emailError}
                        </p>
                    )}
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
