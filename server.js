const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
  transports: ['websocket', 'polling']
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, game: 'Escape Together: The Last Key' }));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const rooms = new Map();
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
function publicRoomState(room) {
  const data = rooms.get(room);
  if (data) io.to(room).emit('roomState', { players: data.players, story: data.story });
}

io.on('connection', socket => {
  socket.on('joinRoom', payload => {
    const rawRoom = String(payload?.room || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,12}$/.test(rawRoom)) return socket.emit('joinError', 'Room code must be 3–12 letters or numbers.');
    const oldRoom = socket.data.room;
    if (oldRoom && oldRoom !== rawRoom) {
      const oldData = rooms.get(oldRoom);
      if (oldData) {
        delete oldData.players[socket.id];
        publicRoomState(oldRoom);
        if (!Object.keys(oldData.players).length) rooms.delete(oldRoom);
      }
      socket.leave(oldRoom);
    }
    let data = rooms.get(rawRoom);
    if (!data) {
      data = { players: {}, story: { diaryFound: false, doorUnlocked: false } };
      rooms.set(rawRoom, data);
    }
    if (Object.keys(data.players).length >= 2 && !data.players[socket.id]) return socket.emit('roomFull');
    socket.join(rawRoom);
    socket.data.room = rawRoom;
    data.players[socket.id] = {
      x: 0, z: 1.5,
      name: String(payload?.name || 'Player').slice(0, 18),
      joinedAt: Date.now()
    };
    socket.emit('joinedRoom', { room: rawRoom, playerId: socket.id });
    publicRoomState(rawRoom);
  });

  socket.on('playerUpdate', payload => {
    const room = socket.data.room;
    const state = payload?.state;
    const data = rooms.get(room);
    if (!room || !data || !data.players[socket.id] || !state) return;
    const safe = {
      x: clamp(state.x, -4.2, 4.2),
      z: clamp(state.z, -4.2, 4.2),
      vx: clamp(state.vx, -10, 10),
      vz: clamp(state.vz, -10, 10),
      name: data.players[socket.id].name
    };
    data.players[socket.id] = { ...data.players[socket.id], ...safe };
    socket.to(room).emit('playerUpdate', { id: socket.id, state: safe });
  });

  socket.on('story', payload => {
    const room = socket.data.room;
    const data = rooms.get(room);
    if (!room || !data) return;
    const text = String(payload?.text || '').slice(0, 240);
    if (/found a diary/i.test(text)) data.story.diaryFound = true;
    if (/door unlocked/i.test(text)) data.story.doorUnlocked = true;
    socket.to(room).emit('story', { text });
    publicRoomState(room);
  });

  socket.on('voiceSignal', payload => {
    const room = socket.data.room;
    if (!room || !rooms.has(room) || !payload) return;
    // Forward only to the other participant in this room.
    socket.to(room).emit('voiceSignal', {
      description: payload.description || undefined,
      candidate: payload.candidate || undefined
    });
  });

  socket.on('disconnect', () => {
    const room = socket.data.room;
    if (!room) return;
    const data = rooms.get(room);
    if (!data) return;
    delete data.players[socket.id];
    publicRoomState(room);
    if (!Object.keys(data.players).length) rooms.delete(room);
  });
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Escape Together listening on ${port}`));
