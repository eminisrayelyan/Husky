import "dotenv/config";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendResetPasswordEmail(email, token) {
    const resetLink = new URL("/new-password", process.env.CLIENT_URL);
    resetLink.searchParams.set("token", token);

    const { error } = await resend.emails.send({
        from: "Password Reset <onboarding@resend.dev>",
        to: email,
        subject: "Reset your password",
        text: resetLink.toString(),
    });

    if (error) {
        console.error("Resend error:", error);
        throw new Error("Could not send password reset email");
    }
}

export { sendResetPasswordEmail };