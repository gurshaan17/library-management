import http from "http";
import app from "./app";
import "./schedulers/returnReminder"; 
import wss from "./websocket/websockets"; 

const PORT = process.env.PORT || 3000;

// Create an HTTP server to handle both HTTP and WebSocket connections
const server = http.createServer(app);

// Upgrade HTTP server to handle WebSocket connections
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});