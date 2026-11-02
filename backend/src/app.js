import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import conversationRouter from "./routes/conversation.route.js";
import menuRouter from "./routes/menu.route.js";
import sessionMiddleware from "./middleware/session.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();

const frontendPath = fileURLToPath(
    new URL("../../frontend/dist/", import.meta.url)
);

if (process.env.RENDER === "true") {
    app.set("trust proxy", 1);
}

if (process.env.NODE_ENV === "production") {
    app.use(express.static(frontendPath));
}

app.use(express.json());
app.use(sessionMiddleware);

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/menu", menuRouter);

app.use("/api", (req, res) => {
    res.status(404).json({
        message: "API route not found",
    });
});

if (process.env.NODE_ENV === "production") {
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(frontendPath, "index.html"));
    });
}

app.use(errorHandler);

export default app;