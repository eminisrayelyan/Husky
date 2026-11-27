import prisma from "../db/prisma.js";
import argon2 from "argon2";
import crypto from "crypto";
import { sendResetPasswordEmail } from "./email.service.js";
import { formatProfile } from "./user.service.js";

async function signUp({ first_name, last_name, email, password }) {
    const existingUser = await prisma.users.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        const error = new Error("Email is already registered");
        error.status = 409;
        throw error;
    }

    const password_hash = await argon2.hash(password);
    
    try {
        const user = await prisma.users.create({
            data: {
                first_name,
                last_name,
                email,
                password_hash,
            },
            select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
            },
        });

        return user;
    } catch (error) {
        if (error.code === "P2002") {
            error.message = "Email is already registered";
            error.status = 409;
        }

        throw error;
    }
}

async function signIn({ email, password }) {
    const user = await prisma.users.findUnique({
        where: { email },
        include: { photos: { select: { storage_key: true } } },
    });

    if (!user) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
    }

    const passwordMatches = await argon2.verify(user.password_hash, password);

    if (!passwordMatches) {
        const error = new Error("Invalid email or password");
        error.status = 401;
        throw error;
    }

    return formatProfile(user);
}

async function forgotPassword({ email }) {
    const user = await prisma.users.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
        },
    });

    if (!user) {
        return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.users.update({
        where: { id: user.id },
        data: {
            reset_token_hash: tokenHash,
            reset_token_expires_at: expiresAt,
        },
    });

    await sendResetPasswordEmail(user.email, token);
}

function hashResetToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}

async function findResetUser(tokenHash) {
    const user = await prisma.users.findFirst({
        where: {
            reset_token_hash: tokenHash,
            reset_token_expires_at: {
                gt: new Date(),
            },
        },
        select: {
            id: true,
            reset_token_expires_at: true,
            first_name: true,
            last_name: true,
            email: true,
        },
    });

    if (!user) {
        const error = new Error("Reset link is invalid or expired");
        error.status = 400;
        throw error;
    }

    return user;
}

async function checkResetToken(token) {
    const user = await findResetUser(hashResetToken(token));
    return Math.max(0, user.reset_token_expires_at.getTime() - Date.now());
}

async function resetPassword({ token, password }) {
    const tokenHash = hashResetToken(token);
    const user = await findResetUser(tokenHash);
    const passwordHash = await argon2.hash(password);

    const result = await prisma.users.updateMany({
        where: {
            id: user.id,
            reset_token_hash: tokenHash,
            reset_token_expires_at: {
                gt: new Date(),
            },
        },
        data: {
            password_hash: passwordHash,
            reset_token_hash: null,
            reset_token_expires_at: null,
        },
    });

    if (result.count !== 1) {
        const error = new Error("Reset link is invalid or expired");
        error.status = 400;
        throw error;
    }

    return {
        ...user,
        id: user.id.toString(),
    };
}

export { signUp, signIn, forgotPassword, checkResetToken, resetPassword };
