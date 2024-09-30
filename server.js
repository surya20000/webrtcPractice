import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const app = express();
const server = createServer(app);
const io = new Server(server);
const allUsers = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

//* exposing public directory to outside
app.use(express.static("public"));

app.get("/", (req, res) => {
  console.log("GET Request /");
  res.sendFile(join(__dirname + "/app/index.html"));
});

//* handel socket events

io.on("connection", (socket) => {
  console.log(`user connected ${socket.id}`);
  socket.on("join-user", (username) => {
    console.log(`${username} joined the room`);
    allUsers[username] = { username, id: socket.id };
    io.emit("joined", allUsers);
  });

  socket.on("offer", ({ from, to, offer }) => {
    io.to(allUsers[to].id).emit("offer", { from, to, offer });
  });

  socket.on("answer", ({ from, to, answer }) => {
    io.to(allUsers[from].id).emit("answer", { from, to, answer });
  });

  socket.on("end-call", ({ from, to }) => {
    io.to(allUsers[to].id).emit("end-call", { from, to });
  });

  socket.on("call-ended", (caller) => {
    const [from, to] = caller;
    io.to(allUsers[from].id).emit("call-ended", caller);
    io.to(allUsers[to].id).emit("call-ended", caller);
  });

  socket.on("icecandidate", (candidate) => {
    //* broadcast to other peers
    socket.broadcast.emit("icecandidate", candidate);
  });
});

server.listen(9000, () => {
  console.log(`Server is up at port 9000`);
});
