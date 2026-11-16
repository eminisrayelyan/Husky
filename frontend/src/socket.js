import { io } from "socket.io-client";

const socketUrl = import.meta.env.DEV ? "http://localhost:3000" : window.location.origin;

const socket = io(socketUrl, {
    withCredentials: true,
    autoConnect: false,
});

export default socket;