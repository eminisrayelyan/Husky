import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header.jsx";
import styles from "./Profile.module.css";
import defaultPhoto from "../../assets/frame.png";
import cameraIcon from "../../assets/camera.png";
import ImageCropper from "./ImageCropper.jsx";

const profileFields = [
    { name: "first_name", label: "First Name", id: "first-name", type: "text", autoComplete: "given-name", required: true },
    { name: "last_name", label: "Last Name", id: "last-name", type: "text", autoComplete: "last-name", required: true },
    { name: "email", label: "Email", id: "profile-email", type: "email", autoComplete: "email", required: true },
    { name: "phone_number", label: "Phone", id: "phone", type: "tel", autoComplete: "tel", required: false },
];

function Profile() {
    const navigate = useNavigate();
    const location = useLocation();

    const [signInUser] = useState(location.state?.user || null);
    const [signInMenu] = useState(location.state?.menuItems ?? null);
    const [user, setUser] = useState(signInUser);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(!signInUser);
    const [error, setError] = useState("");

    const [signingOut, setSigningOut] = useState(false);
    const [logoutError, setLogoutError] = useState("");

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [emailError, setEmailError] = useState("");

    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState("");
    const [photoFile, setPhotoFile] = useState(null);

    const photoInputRef = useRef(null);

    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
    });

    useEffect(() => {
        if (signInUser) {
            navigate("/profile", { replace: true, state: null });
            return;
        }

        const controller = new AbortController();

        async function loadProfile() {
            try {
                const response = await fetch("/api/users/profile", {
                    credentials: "include",
                    signal: controller.signal,
                });

                if (response.status === 401) {
                    navigate("/", { replace: true });
                    return;
                }

                const data = await response.json().catch(() => null);

                if (controller.signal.aborted) {
                    return;
                }

                if (!response.ok) {
                    setError(data?.message || "Could not load profile");
                    return;
                }

                if (!data?.user) {
                    setError("Profile not found");
                    return;
                }

                setUser(data.user);
            } catch (error) {
                if (error.name !== "AbortError") {
                    setError("Could not connect to the server");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadProfile();

        return () => controller.abort();
    }, [navigate, signInUser]);

    function handleEdit() {
        setSaveError("");
        setEmailError("");
        setIsEditing(true);

        setFormData({
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone_number: user.phone_number ?? "",
        });
    }

    function handleChange(event) {
        const { name, value, validity } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        if (name === "email" && value.trim() && validity.valid) {
            setEmailError("");
        }
    }

    function handleEmailInvalid(event) {
        event.preventDefault();
        setSaveError("");

        if (!event.currentTarget.value.trim()) {
            setEmailError("Email is required");
            return;
        }

        setEmailError("Enter a valid email address");
    }

    function handlePhotoChange(event) {
        const file = event.target.files[0];
        event.target.value = "";

        if (!file || uploadingPhoto) {
            return;
        }

        setPhotoError("");

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            setPhotoError("Choose a JPG, PNG, or WebP image.");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setPhotoError("Photo must be 2MB or smaller");
            return;
        }

        setPhotoFile(file);
    }

    async function handlePhotoSave(blob) {
        if (uploadingPhoto) {
            return;
        }

        const uploadData = new FormData();
        uploadData.append("photo", blob, "profile.png");

        setUploadingPhoto(true);
        setPhotoError("");

        try {
            const response = await fetch("/api/users/profile/photo", {
                method: "POST",
                credentials: "include",
                body: uploadData,
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                setPhotoError(data?.message || "Could not upload photo");
                return;
            }

            setUser((previous) => ({
                ...previous,
                photo_url: data.photo_url,
            }));
            setPhotoFile(null);
        } catch {
            setPhotoError("Could not connect to the server");
        } finally {
            setUploadingPhoto(false);
        }
    }

    async function handleSave(event) {
        event.preventDefault();

        if (saving) {
            return;
        }

        setSaving(true);
        setSaveError("");
        setEmailError("");

        try {
            const response = await fetch("/api/users/profile", {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            if (response.status === 401) {
                navigate("/", { replace: true });
                return;
            }

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const emailIssue = data?.errors?.find(
                    (error) => error.field === "email"
                );

                if (emailIssue) {
                    setEmailError(emailIssue.message);
                } else {
                    setSaveError(
                        data?.message ||
                        data?.errors?.[0]?.message ||
                        "Could not update profile"
                    );
                }

                return;
            }

            setUser((previous) => ({
                ...previous,
                ...data.user,
            }));

            setIsEditing(false);
        } catch {
            setSaveError("Could not connect to the server");
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setSaveError("");
        setEmailError("");
        setIsEditing(false);
    }

    function handlePhotoCancel() {
        setPhotoFile(null);
        setPhotoError("");
    }

    async function handleLogout() {
        if (signingOut) {
            return;
        }

        setSigningOut(true);
        setLogoutError("");

        try {
            const response = await fetch("/api/auth/sign-out", {
                method: "POST",
                credentials: "include",
            });

            if (!response.ok) {
                setLogoutError("Could not sign out. Please try again.");
                return;
            }

            setUser(null);
            navigate("/", { replace: true });
        } catch {
            setLogoutError("Could not connect to the server");
        } finally {
            setSigningOut(false);
        }
    }

    if (loading) {
        return <p>Loading profile...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    if (!user) {
        return;
    }

    return (
        <div className={styles.page}>
            <Header initialItems={signInMenu} />

            <main className={styles.main}>
                <section className={styles.card}>
                    <div className={styles["profile-content"]}>
                        <div className={styles["photo-wrapper"]}>
                            <img
                                src={user.photo_url || defaultPhoto}
                                alt="Profile"
                                className={styles["profile-photo"]}
                            />

                            <input
                                ref={photoInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handlePhotoChange}
                                disabled={uploadingPhoto}
                                hidden
                            />

                            <button
                                type="button"
                                className={styles["photo-btn"]}
                                onClick={() => photoInputRef.current.click()}
                                disabled={uploadingPhoto}
                            >
                                <img src={cameraIcon} alt="Change profile photo" />
                            </button>
                        </div>

                        {uploadingPhoto && <p>Uploading photo...</p>}
                        {photoFile && (
                            <ImageCropper
                                key={photoFile.name + photoFile.lastModified}
                                file={photoFile}
                                uploading={uploadingPhoto}
                                onSave={handlePhotoSave}
                                onCancel={handlePhotoCancel}
                            />
                        )}
                        {photoError && (
                            <p className={styles["photo-error"]} role="alert">
                                <span className={styles["error-icon"]}>!</span>
                                {photoError}
                            </p>
                        )}

                        {isEditing ? (
                            <form
                                className={styles["edit-form"]}
                                onSubmit={handleSave}
                            >
                                {profileFields.map((field) => (
                                    <div key={field.name} className={styles["input-field"]}>
                                        <label htmlFor={field.id}>{field.label}</label>
                                        <input
                                            id={field.id}
                                            name={field.name}
                                            type={field.type}
                                            autoComplete={field.autoComplete}
                                            value={formData[field.name]}
                                            onChange={handleChange}
                                            disabled={saving}
                                            required={field.required}
                                            onInvalid={field.name === "email" ? handleEmailInvalid : undefined}
                                            className={field.name === "email" && emailError ? styles["input-error"] : undefined}
                                        />

                                        {field.name === "email" && emailError && (
                                            <p
                                                id="profile-email-error"
                                                className={styles["field-error"]}
                                                role="alert"
                                            >
                                                {emailError}
                                            </p>
                                        )}
                                    </div>
                                ))}
                                {saveError && <p role="alert">{saveError}</p>}

                                <div className={styles["edit-buttons"]}>
                                    <button
                                        type="button"
                                        className={styles["cancel-btn"]}
                                        onClick={handleCancel}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        className={styles["save-btn"]}
                                        disabled={saving}
                                    >
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <dl className={styles.details}>
                                    {profileFields.map((field) => (
                                        <div key={field.name} className={styles.field}>
                                            <dt>{field.label}</dt>
                                            <dd>
                                                {field.name === "phone_number"
                                                    ? user.phone_number || "Not added"
                                                    : user[field.name]}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>

                                <button
                                    type="button"
                                    className={styles["edit-btn"]}
                                    onClick={handleEdit}
                                >
                                    Edit
                                </button>
                            </>
                        )}

                        {logoutError && <p role="alert">{logoutError}</p>}

                        <button
                            type="button"
                            className={styles["logout-btn"]}
                            onClick={handleLogout}
                            disabled={signingOut}
                        >
                            {signingOut ? "Signing out..." : "LOG OUT"}
                        </button>
                    </div>
                </section>
            </main>
        </div>
    );
}

export default Profile;
