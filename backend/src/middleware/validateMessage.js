import { z } from "zod";

const messageSchema = z.object({
    body: z
        .string()
        .trim()
        .min(1, "Message cannot be empty")
        .max(2000, "Message must be 2000 characters or fewer"),
});

function validateMessage(req, res, next) {
    const result = messageSchema.safeParse(req.body);

    if (!result.success) {
        return res.status(400).json({
            errors: result.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    res.locals.messageData = result.data;
    next();
}

export default validateMessage;