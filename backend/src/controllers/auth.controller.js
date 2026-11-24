import { signUp, signIn, forgotPassword, resetPassword } from "../services/auth.service.js";
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

async function signInController(req, res, next) {
    try {
        const user = await signIn(res.locals.signInData);
        const menuItems = await getMenu(user.id);

        req.session.regenerate((error) => {
            if (error) {
                next(error);
                return;
            }

            req.session.userId = user.id;

            req.session.save((error) => {
                if (error) {
                    next(error);
                    return;
                }

                res.status(200).json({
                    message: "Signed in successfully",
                    user,
                    menuItems,
                });
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

async function resetPasswordController(req, res, next) {
    try {
        await resetPassword(res.locals.resetPasswordData);

        return res.status(200).json({
            message: "Password reset successfully",
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

export { signUpController, signInController, signOutController, forgotPasswordController, resetPasswordController };
