const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set the view engine to EJS
app.set("view engine", "ejs");

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, "public")));

// Handle Socket.IO connections
io.on("connection", function (socket) {
    console.log("Socket connected:", socket.id);

    // Handle receiving location data
    socket.on("send-location", function (data) {
        io.emit("receive-location", { id: socket.id, ...data });
    });

    // Handle disconnection
    socket.on("disconnect", function () {
        io.emit("user-disconnected", socket.id);
    });
});
app.get("/", function (req, res) {
    res.render("index");
});

// Start the server
server.listen(3000, function () {
    console.log("Server running on http://localhost:3000");
});
