import "dotenv/config";
import nodemailer from "nodemailer";

const mailer = nodemailer.createTransport({ streamTransport: true, buffer: true });

async function getAccessToken() {
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
            grant_type: "refresh_token",
        }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        throw new Error(`Google token request failed (HTTP ${response.status})`);
    }

    const data = await response.json();
    return data.access_token;
}

async function sendResetPasswordEmail(email, token) {
    const resetLink = new URL("/new-password", process.env.CLIENT_URL);
    resetLink.searchParams.set("token", token);

    const { message } = await mailer.sendMail({
        from: { name: "Husky", address: process.env.GMAIL_USER },
        to: email,
        subject: "Reset your Husky password",
        text: [
            "We received a request to reset your Husky password.",
            "Use this link to choose a new password:",
            resetLink.toString(),
            "If you didn't request a password reset, you can ignore this email.",
        ].join("\n\n"),
    });

    const accessToken = await getAccessToken();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: message.toString("base64url") }),
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        const error = body?.error;
        const reason = error?.details?.find(detail => detail.reason)?.reason
            || error?.errors?.[0]?.reason || error?.status || "Unknown reason";
        throw new Error(`Gmail could not send the reset email (HTTP ${response.status}, ${reason}). ${error?.message || ""}`);
    }
}

export { sendResetPasswordEmail };
