import { useEffect, useRef, useState } from "react";
import styles from "./Profile.module.css";

function ImageCropper({ file, uploading, onSave, onCancel }) {
    const canvasRef = useRef(null);
    
    const [image, setImage] = useState(null);
    const [zoom, setZoom] = useState(1);
    const [horizontal, setHorizontal] = useState(50);
    const [vertical, setVertical] = useState(50);
    const [error, setError] = useState("");

    useEffect(() => {
        const imageUrl = URL.createObjectURL(file);
        const photo = new Image();
        let cancelled = false;

        photo.onload = () => {
            if (!cancelled) {
                setImage(photo);
            }
        };

        photo.onerror = () => {
            if (!cancelled) {
                setError("Could not open this image. Try another photo.");
            }
        };

        photo.src = imageUrl;

        return () => {
            cancelled = true;
            URL.revokeObjectURL(imageUrl);
        };
    }, [file]);

    useEffect(() => {
        if (!image) {
            return;
        }

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const size = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
        const left = (image.naturalWidth - size) * horizontal / 100;
        const top = (image.naturalHeight - size) * vertical / 100;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, left, top, size, size, 0, 0, canvas.width, canvas.height);
    }, [image, zoom, horizontal, vertical]);

    function handleConfirm() {
        if (!image || uploading) {
            return;
        }

        canvasRef.current.toBlob((blob) => {
            if (blob) {
                onSave(blob);
            } else {
                setError("Could not crop this image. Try another photo.");
            }
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

            <fieldset className={styles.cropControls} disabled={!image || uploading}>
                <label htmlFor="crop-zoom">Zoom</label>
                <input id="crop-zoom" type="range" min="1" max="3" step="0.01"
                    value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />

                <label htmlFor="crop-horizontal">Move left or right</label>
                <input id="crop-horizontal" type="range" min="0" max="100"
                    value={horizontal} onChange={(event) => setHorizontal(Number(event.target.value))} />

                <label htmlFor="crop-vertical">Move up or down</label>
                <input id="crop-vertical" type="range" min="0" max="100"
                    value={vertical} onChange={(event) => setVertical(Number(event.target.value))} />
            </fieldset>

            {error && <p role="alert">{error}</p>}

            <div className={styles["edit-buttons"]}>
                <button type="button" className={styles["cancel-btn"]}
                    disabled={uploading} onClick={onCancel}>Cancel</button>
                <button type="button" className={styles["save-btn"]}
                    disabled={!image || uploading} onClick={handleConfirm}>
                    {uploading ? "Saving..." : "Confirm and save"}
                </button>
            </div>
        </section>
    );
}

export default ImageCropper;