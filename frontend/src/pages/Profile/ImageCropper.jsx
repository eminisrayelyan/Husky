import { useEffect, useRef, useState } from "react";
import styles from "./Profile.module.css";

function ImageCropper({ file, uploading, onSave, onCancel }) {
    const canvasRef = useRef(null);

    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [horizontal, setHorizontal] = useState(50);
    const [vertical, setVertical] = useState(50);
    const [error, setError] = useState("");

    const disabled = !image || uploading;

    useEffect(() => {
        const imageUrl = URL.createObjectURL(file);
        const photo = new Image();

        photo.onload = () => {
            setImage(photo);
        };

        photo.onerror = () => {
            setError("Could not open this image. Try another photo.");
        };

        photo.src = imageUrl;

        return () => {
            photo.onload = null;
            photo.onerror = null;
            URL.revokeObjectURL(imageUrl);
        };
    }, [file]);

    useEffect(() => {
        if (!image) {
            return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const cropSize = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
        const cropLeft = (image.naturalWidth - cropSize) * horizontal / 100;
        const cropTop = (image.naturalHeight - cropSize) * vertical / 100;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, cropLeft, cropTop, cropSize, cropSize, 0, 0, canvas.width, canvas.height);
    }, [image, zoom, horizontal, vertical]);

    function handleConfirm() {
        if (disabled) {
            return;
        }

        canvasRef.current.toBlob((blob) => {
            if (!blob) {
                setError("Could not crop this image. Try another photo.");
                return;
            }

            onSave(blob);
        }, "image/png");
    }

    return (
        <section className={styles.cropper} aria-labelledby="crop-title">
            <h2 id="crop-title">Crop your photo</h2>
            <p>Adjust the square preview, then confirm to save.</p>

            <canvas
                ref={canvasRef}
                width={512}
                height={512}
                className={styles.cropPreview}
                role="img"
                aria-label="Square crop preview"
            />

            <fieldset className={styles.cropControls} disabled={disabled}>
                <label htmlFor="crop-zoom">Zoom</label>
                <input
                    id="crop-zoom"
                    type="range"
                    min="1"
                    max="3"
                    step="0.01"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                />

                <label htmlFor="crop-horizontal">Move left or right</label>
                <input
                    id="crop-horizontal"
                    type="range"
                    min="0"
                    max="100"
                    value={horizontal}
                    onChange={(event) => setHorizontal(Number(event.target.value))}
                />

                <label htmlFor="crop-vertical">Move up or down</label>
                <input
                    id="crop-vertical"
                    type="range"
                    min="0"
                    max="100"
                    value={vertical}
                    onChange={(event) => setVertical(Number(event.target.value))}
                />
            </fieldset>

            {error && <p role="alert">{error}</p>}

            <div className={styles["edit-buttons"]}>
                <button
                    type="button"
                    className={styles["cancel-btn"]}
                    disabled={uploading}
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className={styles["save-btn"]}
                    disabled={disabled}
                    onClick={handleConfirm}
                >
                    {uploading ? "Saving..." : "Confirm and save"}
                </button>
            </div>
        </section>
    );
}

export default ImageCropper;
