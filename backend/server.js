// backend/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const peer = require('peer');
const cors = require('cors');
const config = require('./config');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// PeerJS
const peerServer = peer.ExpressPeerServer(server, {
    debug: true,
    path: '/'
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PeerJS роут
app.use('/peerjs', peerServer);

// ====================== ТВОИ РОУТЫ ======================
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const teacherRoutes = require('./routes/teacher');
const progressRoutes = require('./routes/progress');
const lessonsRoutes = require('./routes/lessons');
const scheduleRoutes = require('./routes/schedule');

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/schedule', scheduleRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ProtoG Backend работает' });
});

// ====================== SOCKET.IO ======================
io.on('connection', (socket) => {
    console.log(`🟢 Пользователь подключился: ${socket.id}`);

    socket.on('join-room', (roomId, userId, role) => {
        socket.join(roomId);
        console.log(`👤 ${role} ${userId} присоединился к комнате ${roomId}`);
        socket.to(roomId).emit('user-connected', userId, role);
    });

    socket.on('send-message', (roomId, messageData) => {
        io.to(roomId).emit('receive-message', messageData);
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Пользователь отключился: ${socket.id}`);
    });
});

const PORT = config.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 ProtoG сервер запущен на http://localhost:${PORT}`);
    console.log(`🔗 PeerJS доступен по адресу: http://localhost:${PORT}/peerjs`);
    console.log(`Запустите туннель (CloudPub.ru) и обновите .env с новым VITE_API_URL для работы с фронтендом!`);
});