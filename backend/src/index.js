import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import sessionMiddleware from "./middleware/session.js";

const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

function isAllowedOrigin(origin) {
    if (origin === frontendUrl) return true;

    // Vite can use another local port when its default port is busy.
    return process.env.NODE_ENV !== "production" &&
        /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
}

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
        credentials: true,
    },
    allowRequest: (req, callback) => {
        callback(null, isAllowedOrigin(req.headers.origin));
    },
});

io.engine.use(sessionMiddleware);

io.use((socket, next) => {
    const userId = socket.request.session?.userId;

    if (!userId) {
        return next(new Error("Please sign in to continue"));
    }

    next();
});

io.on("connection", (socket) => {
    const userId = socket.request.session.userId;

    socket.join(`user:${userId}`);
    socket.join(`session:${socket.request.session.id}`);
});

app.set("io", io);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
