import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
});

function validateForgotPassword(req, res, next) {
  const result = forgotPasswordSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      errors: result.error.issues.map((issue) => ({
        field: issue.path[0],
        message: issue.message,
      })),
    });
  }

  res.locals.forgotPasswordData = result.data;
  next();
}

export default validateForgotPassword;