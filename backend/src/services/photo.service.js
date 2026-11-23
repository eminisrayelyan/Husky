import { randomUUID } from "node:crypto";
import sharp from "sharp";
import prisma from "../db/prisma.js";
import supabase from "../db/supabase.js";

async function deleteFile(storageKey) {
    try {
        const { error } = await supabase.storage
            .from("avatars")
            .remove([storageKey]);

        if (error) {
            console.error("Could not delete photo:", error.message);
        }
    } catch (error) {
        console.error("Could not delete photo:", error.message);
    }
}

async function uploadProfilePhoto(userId, file) {
    // The upload middleware checks that a file exists and is under 2 MB.
    let imageBuffer;

    try {
        const image = sharp(file.buffer, {
            limitInputPixels: 16000000,
        });

        const metadata = await image.metadata();

        if (!["jpeg", "png", "webp"].includes(metadata.format)) {
            throw new Error("Invalid image");
        }

        imageBuffer = await image
            .rotate()
            .resize(512, 512, { fit: "cover" })
            .webp({ quality: 85 })
            .toBuffer();
    } catch {
        const error = new Error("Choose a valid JPG, PNG, or WebP image");
        error.status = 400;
        throw error;
    }

    if (imageBuffer.length > 2 * 1024 * 1024) {
        const error = new Error("Photo must be 2MB or smaller");
        error.status = 413;
        throw error;
    }

    // Upload the new image.
    const id = BigInt(userId);
    const storageKey = `${id}/${randomUUID()}.webp`;

    const { error } = await supabase.storage
        .from("avatars")
        .upload(storageKey, imageBuffer, {
            contentType: "image/webp",
        });

    if (error) {
        console.error("Upload failed:", error.message);
        throw new Error("Could not upload photo");
    }

    let oldStorageKey = null;

    try {
        await prisma.$transaction(async (tx) => {
            // Prevent two uploads from updating this user at the same time.
            await tx.$queryRaw`
                SELECT id FROM public.users
                WHERE id = ${id}
                FOR UPDATE
            `;

            const user = await tx.users.findUniqueOrThrow({
                where: { id },
                select: { profile_photo_id: true },
            });

            if (user.profile_photo_id !== null) {
                const photo = await tx.photos.findUniqueOrThrow({
                    where: { id: user.profile_photo_id },
                });

                oldStorageKey = photo.storage_key;

                // Update the existing photo row.
                await tx.photos.update({
                    where: { id: photo.id },
                    data: { storage_key: storageKey },
                });
            } else {
                // First upload: create a photo row.
                const photo = await tx.photos.create({
                    data: { storage_key: storageKey },
                });

                await tx.users.update({
                    where: { id },
                    data: { profile_photo_id: photo.id },
                });
            }
        });
    } catch (error) {
        await deleteFile(storageKey);
        throw error;
    }

    // Remove the old file after saving the new reference.
    if (oldStorageKey) {
        await deleteFile(oldStorageKey);
    }

    const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(storageKey);

    return { photo_url: data.publicUrl };
}

export { uploadProfilePhoto };