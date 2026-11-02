import { z } from "zod";

const conversationSchema = z.object({
    otherUserId: z
        .string()
        .trim()
        .min(1, "User ID is required")
        .max(19, "Invalid user ID")
        .refine((value) => {
            const onlyDigits = [...value].every((character) =>
                "0123456789".includes(character)
            );

            return (
                onlyDigits &&
                BigInt(value) > 0n &&
                BigInt(value) <= 9223372036854775807n
            );
        }, "Invalid user ID"),
});

function validateConversation(req, res, next) {
    const result = conversationSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    res.locals.conversationData = result.data;
    next();
}

export default validateConversation;