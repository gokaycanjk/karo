const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Karo Socket Sunucusu Aktif!");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// socketId -> { username, roomId }
const users = {};
// roomId -> { videoUrl, isPlaying, playedSeconds, lastUpdated }
const rooms = {};
// roomId -> hostSocketId
const roomHosts = {};
// roomId -> string[] (video id listesi)
const roomQueues = {};

io.on("connection", (socket) => {
  console.log(">>> BİR KULLANICI BAĞLANDI! Soket ID:", socket.id);

  socket.on("join-room", ({ roomId, username }) => {
    if (!roomId) return;
    socket.join(roomId);

    users[socket.id] = { username: username || "Misafir", roomId };

    if (!roomHosts[roomId]) {
      roomHosts[roomId] = socket.id;
      console.log(`>>> [HOST ATANDI] ${username} (${socket.id}) -> Oda #${roomId}`);
    }

    if (!roomQueues[roomId]) {
      roomQueues[roomId] = [];
    }

    const hostUser = users[roomHosts[roomId]]?.username || "";
    const activeUsers = Object.values(users)
      .filter((u) => u.roomId === roomId)
      .map((u) => u.username);

    io.to(roomId).emit("user-list", {
      users: activeUsers,
      hostName: hostUser
    });

    // Mevcut kuyruğu yeni katılana ilet
    socket.emit("queue-updated", roomQueues[roomId]);

    // Odaya yeni girene güncel saniyeyi hesaplayarak ilet
    if (rooms[roomId] && rooms[roomId].videoUrl) {
      const room = rooms[roomId];
      let currentSeconds = room.playedSeconds || 0;

      // Eğer video oynuyorsa, aradan geçen süreyi üzerine ekle
      if (room.isPlaying && room.lastUpdated) {
        const elapsed = (Date.now() - room.lastUpdated) / 1000;
        currentSeconds += elapsed;
      }

      socket.emit("video-updated", {
        videoUrl: room.videoUrl,
        isPlaying: room.isPlaying,
        playedSeconds: currentSeconds
      });
    }
  });

  socket.on("sync-video", (data) => {
    if (!data.roomId) return;

    // Sadece oda sahibi (host) videoyu kontrol edebilir
    if (roomHosts[data.roomId] && roomHosts[data.roomId] !== socket.id) {
      return;
    }

    rooms[data.roomId] = {
      videoUrl: data.videoUrl,
      isPlaying: data.isPlaying,
      playedSeconds: data.playedSeconds || 0,
      lastUpdated: Date.now() // Son senkronizasyon zamanı
    };

    socket.to(data.roomId).emit("video-updated", data);
  });

  // Ortak Kuyruk Güncellemesi
  socket.on("update-queue", ({ roomId, queue }) => {
    if (!roomId) return;
    roomQueues[roomId] = queue || [];
    io.to(roomId).emit("queue-updated", roomQueues[roomId]);
  });

  socket.on("send-message", ({ roomId, message }) => {
    if (!roomId) return;
    socket.to(roomId).emit("message-received", message);
  });

  socket.on("send-reaction", ({ roomId, reaction }) => {
    if (!roomId) return;
    socket.to(roomId).emit("reaction-received", reaction);
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      const { roomId, username } = user;
      delete users[socket.id];
      console.log(`>>> [AYRILDI] ${username}`);

      if (roomHosts[roomId] === socket.id) {
        delete roomHosts[roomId];
        const remainingSocketId = Object.keys(users).find(
          (id) => users[id].roomId === roomId
        );
        if (remainingSocketId) {
          roomHosts[roomId] = remainingSocketId;
          console.log(`>>> [YENİ HOST] ${users[remainingSocketId].username}`);
        }
      }

      const hostUser = roomHosts[roomId] ? users[roomHosts[roomId]]?.username : "";
      const activeUsers = Object.values(users)
        .filter((u) => u.roomId === roomId)
        .map((u) => u.username);

      io.to(roomId).emit("user-list", {
        users: activeUsers,
        hostName: hostUser
      });
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------------");
  console.log(`SOCKET SUNUCUSU ${PORT} PORTUNDA ÇALIŞIYOR!`);
  console.log("-----------------------------------------");
});