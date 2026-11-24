import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import sessionMiddleware from "./middleware/session.js";

const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const allowedOrigins = [frontendUrl];

if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push(
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    );
}

function isAllowedOrigin(origin) {
    if (!origin) {
        return true;
    }

    return allowedOrigins.includes(origin);
}

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
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
    const sessionId = socket.request.session.id;

    socket.join(`user:${userId}`);
    socket.join(`session:${sessionId}`);
});

app.set("io", io);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
