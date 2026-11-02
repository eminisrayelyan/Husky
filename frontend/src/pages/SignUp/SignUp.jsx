import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignUp.module.css";

function SignUp() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const data = {
      first_name: formData.get("first-name"),
      last_name: formData.get("last-name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirm-password"),
    };

    const errors = {};

    if (!data.first_name.trim()) {
      errors.first_name = "First name is required";
    }

    if (!data.last_name.trim()) {
      errors.last_name = "Last name is required";
    }

    if (!data.email.trim()) {
      errors.email = "Email is required";
    } else if (!form.elements.email.validity.valid) {
      errors.email = "Enter a valid email address";
    }

    if (data.password.length < 8) {
      errors.password = "Password must have at least 8 characters";
    }

    if (!data.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setError("");
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        const errors = {};

        for (const issue of result?.errors || []) {
          if (Object.hasOwn(data, issue.field)) {
            errors[issue.field] = issue.message;
          }
        }

        if (response.status === 409) {
          errors.email = result?.message || "Email is already registered";
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length === 0) {
          setError(result?.message || "Could not create account");
        }

        return;
      }

      navigate("/");
    } catch {
      setError("Could not connect to the server");
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
      <h1>SIGN UP</h1>

      <div className={styles["inputs-wrapper"]}>
        <div className={styles["input-wrapper"]}>
          <label htmlFor="first-name">First Name</label>

          <input
            type="text"
            id="first-name"
            name="first-name"
            autoComplete="given-name"
            className={`${styles.input} ${fieldErrors.first_name ? styles["input-error"] : ""
              }`}
            aria-invalid={Boolean(fieldErrors.first_name)}
            aria-describedby="first-name-error"
            required
          />

          <p
            id="first-name-error"
            className={styles["field-error"]}
            aria-live="polite"
          >
            {fieldErrors.first_name}
          </p>
        </div>

        <div className={styles["input-wrapper"]}>
          <label htmlFor="last-name">Last Name</label>

          <input
            type="text"
            id="last-name"
            name="last-name"
            autoComplete="family-name"
            className={`${styles.input} ${fieldErrors.last_name ? styles["input-error"] : ""
              }`}
            aria-invalid={Boolean(fieldErrors.last_name)}
            aria-describedby="last-name-error"
            required
          />

          <p
            id="last-name-error"
            className={styles["field-error"]}
            aria-live="polite"
          >
            {fieldErrors.last_name}
          </p>
        </div>

        <div className={styles["input-wrapper"]}>
          <label htmlFor="email">Email</label>

          <input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            className={`${styles.input} ${fieldErrors.email ? styles["input-error"] : ""
              }`}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby="email-error"
            required
          />

          <p
            id="email-error"
            className={styles["field-error"]}
            aria-live="polite"
          >
            {fieldErrors.email}
          </p>
        </div>

        <div className={styles["input-wrapper"]}>
          <label htmlFor="password">Password</label>

          <input
            type="password"
            id="password"
            name="password"
            autoComplete="new-password"
            className={`${styles.input} ${fieldErrors.password ? styles["input-error"] : ""
              }`}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby="password-error"
            minLength={8}
            required
          />

          <p
            id="password-error"
            className={styles["field-error"]}
            aria-live="polite"
          >
            {fieldErrors.password}
          </p>
        </div>

        <div className={styles["input-wrapper"]}>
          <label htmlFor="confirm-password">Confirm Password</label>

          <input
            type="password"
            id="confirm-password"
            name="confirm-password"
            autoComplete="new-password"
            className={`${styles.input} ${fieldErrors.confirmPassword ? styles["input-error"] : ""
              }`}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby="confirm-password-error"
            minLength={8}
            required
          />

          <p
            id="confirm-password-error"
            className={styles["field-error"]}
            aria-live="polite"
          >
            {fieldErrors.confirmPassword}
          </p>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}

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
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        <Link to="/" className={styles["sign-in"]}>
          SIGN IN
        </Link>
      </div>
    </form>
  );
}

export default SignUp;