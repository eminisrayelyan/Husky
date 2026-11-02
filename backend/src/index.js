import { createServer } from "node:http";
import { Server } from "socket.io";
import app from "./app.js";
import sessionMiddleware from "./middleware/session.js";

const PORT = process.env.PORT || 3000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: frontendUrl,
        credentials: true,
    },
    allowRequest: (req, callback) => {
        callback(null, req.headers.origin === frontendUrl);
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