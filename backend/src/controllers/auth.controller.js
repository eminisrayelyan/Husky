import { signUp, signIn, forgotPassword, checkResetToken, resetPassword } from "../services/auth.service.js";
import { getMenu } from "../services/menu.service.js";

async function signUpController(req, res, next) {
    try {
        const user = await signUp(res.locals.signUpData);

        return res.status(201).json({
            message: "Account created successfully",
            user: {
                ...user,
                id: user.id.toString(),
            },
        });
    } catch (error) {
        next(error);
    }
}

function startSession(req, userId, callback) {
    req.session.regenerate((error) => {
        if (error) return callback(error);

        req.session.userId = userId;
        req.session.save(callback);
    });
}

async function signInController(req, res, next) {
    try {
        const user = await signIn(res.locals.signInData);
        const menuItems = await getMenu(user.id);

        startSession(req, user.id, (error) => {
            if (error) return next(error);

            res.status(200).json({
                message: "Signed in successfully",
                user,
                menuItems,
            });
        });
    } catch (error) {
        next(error);
    }
}

async function forgotPasswordController(req, res, next) {
    try {
        await forgotPassword(res.locals.forgotPasswordData);

        return res.status(200).json({
            message: "If an account exists with this email, a password reset link has been sent.",
        });
    } catch (error) {
        next(error);
    }
}

async function checkResetTokenController(req, res, next) {
    try {
        if (typeof req.body?.token !== "string") {
            return res.status(400).json({ message: "Reset link is invalid or expired" });
        }
        await checkResetToken(req.body.token);
        return res.sendStatus(204);
    } catch (error) {
        next(error);
    }
}

async function resetPasswordController(req, res, next) {
    try {
        const user = await resetPassword(res.locals.resetPasswordData);

        startSession(req, user.id, (error) => {
            if (error) return next(error);

            res.status(200).json({ message: "Password reset successfully" });
        });
    } catch (error) {
        next(error);
    }
}

function signOutController(req, res, next) {
    const sessionId = req.session.id;

    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        const io = req.app.get("io");

        if (io) {
            io.in(`session:${sessionId}`).disconnectSockets();
        }

        res.clearCookie("connect.sid", {
            path: "/",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        return res.status(200).json({
            message: "Signed out successfully",
        });
    });
}

export { signUpController, signInController, signOutController, forgotPasswordController, checkResetTokenController, resetPasswordController };
