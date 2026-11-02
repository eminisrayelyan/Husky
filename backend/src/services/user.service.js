import prisma from "../db/prisma.js";
import supabase from "../db/supabase.js";

async function getProfile(userId) {
    const user = await prisma.users.findUnique({
        where: {
            id: BigInt(userId),
        },
        select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone_number: true,
            profile_photo_id: true,
        },
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    let photoUrl = null;

    if (user.profile_photo_id !== null) {
        const photo = await prisma.photos.findUnique({
            where: {
                id: user.profile_photo_id,
            },
        });

        if (photo) {
            const { data } = supabase.storage
                .from("avatars")
                .getPublicUrl(photo.storage_key);

            photoUrl = data.publicUrl;
        }
    }

    return {
        id: user.id.toString(),
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
        photo_url: photoUrl,
    };
}

async function updateProfile(userId, { first_name, last_name, email, phone_number }) {
    try {
        const user = await prisma.users.update({
            where: {
                id: BigInt(userId),
            },
            data: {
                first_name,
                last_name,
                email,
                phone_number: phone_number || null,
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone_number: true,
            },
        });

        return {
            ...user,
            id: user.id.toString(),
        };
    } catch (error) {
        if (error.code === "P2002") {
            const duplicateError = new Error("Email is already registered");
            duplicateError.status = 409;
            throw duplicateError;
        }

        if (error.code === "P2025") {
            const notFoundError = new Error("User not found");
            notFoundError.status = 404;
            throw notFoundError;
        }

        throw error;
    }
}

async function getUsers(userId) {
    const users = await prisma.users.findMany({
        where: {
            id: {
                not: BigInt(userId),
            },
        },
        select: {
            id: true,
            first_name: true,
            last_name: true,
        },
        orderBy: [
            { first_name: "asc" },
            { last_name: "asc" },
        ],
    });

    return users.map((user) => ({
        ...user,
        id: user.id.toString(),
    }));
}

export { getProfile, updateProfile, getUsers };