import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import styles from "./NewPassword.module.css";

function NewPassword() {
    const navigate = useNavigate();
    
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const [checkedLink, setCheckedLink] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) return;
        const controller = new AbortController();

        async function checkLink() {
            let status;
            try {
                const response = await fetch("/api/auth/check-reset-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                    signal: controller.signal,
                });
                if (response.ok) status = "valid";
                else if (response.status === 400) status = "invalid";
                else status = "error";
            } catch {
                status = "error";
            }
            if (!controller.signal.aborted) setCheckedLink({ token, status });
        }

        checkLink();
        return () => controller.abort();
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();

        if (loading) {
            return;
        }

        setError("");

        const formData = new FormData(event.currentTarget);
        const password = formData.get("new-password");
        const confirmPassword = formData.get("confirm-password");

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

            navigate("/profile", { replace: true });
        } catch {
            setError("Could not connect to the server");
        } finally {
            setLoading(false);
        }
    }

    if (!token || (checkedLink?.token === token && checkedLink.status === "invalid")) {
        return <div><p>This reset link is invalid or expired.</p><Link to="/forgot-password">Request a new link</Link></div>;
    }
    if (checkedLink?.token !== token) return <p>Checking reset link…</p>;
    if (checkedLink.status === "error") return <p>Could not check the reset link. Refresh to try again.</p>;

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
