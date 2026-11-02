import { z } from "zod";

const resetPasswordSchema = z
    .object({
        token: z.string(),
        password: z.string().min(8, "Password must contain at least 8 characters"),
        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

function validateResetPassword(req, res, next) {
    const result = resetPasswordSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            errors: result.error.issues.map((issue) => ({
                field: issue.path[0],
                message: issue.message,
            })),
        });
    }

    res.locals.resetPasswordData = result.data;
    next();
}

export default validateResetPassword;