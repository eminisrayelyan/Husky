import { z } from "zod";

const profileSchema = z.object({
    first_name: z.string()
        .trim()
        .min(1, "First name is required")
        .max(100, "First name is too long"),

    last_name: z
        .string()
        .trim()
        .min(1, "Last name is required")
        .max(100, "Last name is too long"),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Invalid email"),

    phone_number: z
        .string()
        .trim()
        .max(30, "Phone number is too long"),
});

function validateProfile(req, res, next) {
    const result = profileSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    res.locals.profileData = result.data;
    next();
}

export default validateProfile;