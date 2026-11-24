import prisma from "../db/prisma.js";
import supabase from "../db/supabase.js";

function formatProfile(user) {
    let photoUrl = null;

    if (user.photos) {
        const { data } = supabase.storage
            .from("avatars")
            .getPublicUrl(user.photos.storage_key);
        photoUrl = data.publicUrl;
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
            photos: { select: { storage_key: true } },
        },
    });

    if (!user) {
        const error = new Error("User not found");
        error.status = 404;
        throw error;
    }

    return formatProfile(user);
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
            const target = error.meta?.target;

            const fields = Array.isArray(target)
                ? target
                : typeof target === "string"
                    ? [target]
                    : [];

            if (fields.includes("email")) {
                throw new Error("Email is already registered");
            }

            if (fields.includes("phone_number")) {
                throw new Error("Phone number is already registered");
            }

            throw new Error("This value is already registered");
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
            photos: {
                select: {
                    storage_key: true,
                },
            },
        },
        orderBy: [
            { first_name: "asc" },
            { last_name: "asc" },
        ],
    });

    return users.map((user) => {
        let photoUrl = null;

        if (user.photos) {
            const { data } = supabase.storage
                .from("avatars")
                .getPublicUrl(user.photos.storage_key);

            photoUrl = data.publicUrl;
        }

        return {
            id: user.id.toString(),
            first_name: user.first_name,
            last_name: user.last_name,
            photo_url: photoUrl,
        };
    });
}

export { getProfile, updateProfile, getUsers, formatProfile };
