import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

async function sendResetPasswordEmail(email, token) {
    const resetLink = new URL("/new-password", process.env.CLIENT_URL);
    resetLink.searchParams.set("token", token);

    await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: "Reset your password",
        text: resetLink.toString(),
    });
}

export { sendResetPasswordEmail };
