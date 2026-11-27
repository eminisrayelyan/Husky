import { Router } from "express";
import validateSignIn from "../middleware/validateSignIn.js";
import validateSignUp from "../middleware/validateSignUp.js";
import signUpLimiter from "../middleware/signUpLimiter.js";
import validateForgotPassword from "../middleware/validateForgotPassword.js";
import validateResetPassword from "../middleware/validateResetPassword.js";
import {
    signUpController,
    signInController,
    signOutController,
    forgotPasswordController,
    checkResetTokenController,
    resetPasswordController
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/sign-up", signUpLimiter, validateSignUp, signUpController);
router.post("/sign-in", validateSignIn, signInController);
router.post("/forgot-password", validateForgotPassword, forgotPasswordController);
router.post("/check-reset-token", checkResetTokenController);
router.post("/reset-password", validateResetPassword, resetPasswordController);
router.post("/sign-out", signOutController);

export default router;
