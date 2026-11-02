import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignIn.module.css";

function SignIn() {
    const navigate = useNavigate();

    const [message, setMessage] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) return;

        const formData = new FormData(event.currentTarget);

        setMessage("");
        setFieldErrors({});
        setLoading(true);

        try {
            const response = await fetch("/api/auth/sign-in", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: formData.get("email"),
                    password: formData.get("password"),
                }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const errors = {};

                for (const error of result?.errors || []) {
                    if (error.field === "email" || error.field === "password") {
                        errors[error.field] = error.message;
                    }
                }

                setFieldErrors(errors);

                if (Object.keys(errors).length === 0) {
                    setMessage(result?.message || "Could not sign in");
                }

                return;
            }

            setMessage("Signed in successfully");
            navigate("/profile");
        } catch {
            setMessage("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
        >
            <h1>SIGN IN</h1>

            <div className={styles["inputs-wrapper"]}>
                <div className={styles["input-wrapper"]}>
                    <label htmlFor="email">Email Address</label>

                    <input
                        type="email"
                        id="email"
                        name="email"
                        className={`${styles.input} ${fieldErrors.email ? styles["input-error"] : ""
                            }`}
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-describedby={
                            fieldErrors.email ? "email-error" : undefined
                        }
                        required
                        autoComplete="username"
                    />

                    {fieldErrors.email && (
                        <p
                            id="email-error"
                            className={styles["field-error"]}
                            role="alert"
                        >
                            {fieldErrors.email}
                        </p>
                    )}
                </div>

                <div className={styles["input-wrapper"]}>
                    <label htmlFor="password">Password</label>

                    <input
                        type="password"
                        id="password"
                        name="password"
                        className={`${styles.input} ${fieldErrors.password ? styles["input-error"] : ""
                            }`}
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={
                            fieldErrors.password ? "password-error" : undefined
                        }
                        required
                        autoComplete="current-password"
                    />

                    {fieldErrors.password && (
                        <p
                            id="password-error"
                            className={styles["field-error"]}
                            role="alert"
                        >
                            {fieldErrors.password}
                        </p>
                    )}
                </div>
            </div>

            {message && <p role="status">{message}</p>}

            <Link
                to="/forgot-password"
                className={styles["forgot-password"]}
            >
                Forgot Password?
            </Link>

            <div className={styles["btn-wrapper"]}>
                <button
                    type="submit"
                    className={styles.btn}
                    disabled={loading}
                >
                    {loading ? "Signing in..." : "Sign In"}
                </button>

                <Link to="/signup" className={styles["sign-up"]}>
                    SIGN UP
                </Link>
            </div>
        </form>
    );
}

export default SignIn;