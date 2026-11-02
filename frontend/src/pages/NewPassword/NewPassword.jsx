import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "./NewPassword.module.css";

function NewPassword() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) {
            return;
        }

        setError("");

        const token = searchParams.get("token");

        const formData = new FormData(event.currentTarget);
        const password = formData.get("new-password");
        const confirmPassword = formData.get("confirm-password");

        if (!token) {
            setError("Invalid reset link. Please request a new one.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    token,
                    password,
                    confirmPassword,
                }),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setError(
                    data?.message ||
                    data?.errors?.[0]?.message ||
                    "Could not reset password"
                );
                return;
            }

            navigate("/", { replace: true });
        } catch {
            setError("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <h1>CREATE NEW PASSWORD</h1>

            <div className={styles["inputs-wrapper"]}>
                <div className={styles["input-wrapper"]}>
                    <label htmlFor="new-password">New Password</label>
                    <input
                        type="password"
                        id="new-password"
                        name="new-password"
                        autoComplete="new-password"
                        className={styles.input}
                        minLength={8}
                        required
                    />
                </div>

                <div className={styles["input-wrapper"]}>
                    <label htmlFor="confirm-password">Confirm Password</label>
                    <input
                        type="password"
                        id="confirm-password"
                        name="confirm-password"
                        autoComplete="new-password"
                        className={styles.input}
                        minLength={8}
                        required
                    />
                </div>
            </div>

            {error && <p role="alert">{error}</p>}

            <div className={styles["btn-wrapper"]}>
                <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                >
                    {loading ? "Saving..." : "Save"}
                </button>

                <Link to="/" className={styles["sign-in"]}>
                    SIGN IN
                </Link>
            </div>
        </form>
    );
}

export default NewPassword;
