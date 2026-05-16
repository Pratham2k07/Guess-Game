const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

// Helper to generate room code
function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new room
    socket.on('createRoom', ({ username }, callback) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            host: socket.id,
            players: [{ id: socket.id, name: username, score: 0 }],
            state: 'lobby',
            settings: { difficulty: 1 },
            gameData: null
        };
        socket.join(roomCode);
        socket.roomId = roomCode;
        socket.username = username;
        callback({ success: true, roomCode, players: rooms[roomCode].players });
    });

    // Join an existing room
    socket.on('joinRoom', ({ roomCode, username }, callback) => {
        roomCode = roomCode.toUpperCase();
        const room = rooms[roomCode];
        if (!room) {
            return callback({ success: false, message: 'Room not found' });
        }
        if (room.state !== 'lobby') {
            return callback({ success: false, message: 'Game already in progress' });
        }
        if (room.players.find(p => p.name === username)) {
            return callback({ success: false, message: 'Username already taken in this room' });
        }

        room.players.push({ id: socket.id, name: username, score: 0 });
        socket.join(roomCode);
        socket.roomId = roomCode;
        socket.username = username;

        // Notify others
        socket.to(roomCode).emit('playerJoined', room.players);
        callback({ success: true, roomCode, players: room.players });
    });

    // Start game
    socket.on('startGame', ({ difficulty }) => {
        const room = rooms[socket.roomId];
        if (room && room.host === socket.id && room.state === 'lobby') {
            room.state = 'playing';
            let maxAttempts = difficulty === 3 ? 5 : 1000;
            let timeLimit = difficulty === 1 ? 60 : (difficulty === 2 ? 45 : 30);
            let range = difficulty === 1 ? 50 : (difficulty === 2 ? 75 : 100);

            room.gameData = {
                currentPlayerIndex: 0,
                maxAttempts,
                timeLimit,
                range,
                number: Math.floor(Math.random() * range) + 1,
                attempts: 0,
                timer: null,
                timeLeft: timeLimit,
                isBreak: false
            };

            io.to(socket.roomId).emit('gameStarted', { difficulty, range });
            startTurn(socket.roomId);
        }
    });

    // Handle guess
    socket.on('makeGuess', (guess) => {
        const room = rooms[socket.roomId];
        if (!room || room.state !== 'playing') return;

        const gd = room.gameData;
        const currentPlayer = room.players[gd.currentPlayerIndex];

        if (currentPlayer.id !== socket.id || gd.isBreak) return;

        gd.attempts++;
        guess = parseInt(guess);

        let result = '';
        let turnEnds = false;

        if (guess === gd.number) {
            result = 'correct';
            clearInterval(gd.timer);
            currentPlayer.score += 100; // 100 points for winning
            turnEnds = true;
        } else if (guess < gd.number) {
            result = 'too_low';
            turnEnds = true; // Turn passes on any wrong guess
        } else {
            result = 'too_high';
            turnEnds = true; // Turn passes on any wrong guess
        }

        io.to(socket.roomId).emit('guessResult', {
            username: currentPlayer.name,
            guess,
            result,
            attempts: gd.attempts,
            players: room.players
        });

        if (turnEnds) {
            if (result === 'correct') {
                endGame(socket.roomId);
            } else {
                gd.currentPlayerIndex = (gd.currentPlayerIndex + 1) % room.players.length;
                handleNextTurn(socket.roomId);
            }
        }
    });

    function startTurn(roomId) {
        const room = rooms[roomId];
        if (!room) return;
        const gd = room.gameData;

        gd.isBreak = false;
        gd.attempts = 0;
        gd.timeLeft = gd.timeLimit;
        // Target number stays the same for everyone!

        const currentPlayer = room.players[gd.currentPlayerIndex];
        
        io.to(roomId).emit('turnUpdate', {
            username: currentPlayer.name,
            timeLeft: gd.timeLeft
        });

        clearInterval(gd.timer);
        gd.timer = setInterval(() => {
            gd.timeLeft--;
            io.to(roomId).emit('timerUpdate', gd.timeLeft);

            if (gd.timeLeft < 0) {
                clearInterval(gd.timer);
                gd.currentPlayerIndex = (gd.currentPlayerIndex + 1) % room.players.length;
                io.to(roomId).emit('turnTimeout', { username: currentPlayer.name });
                handleNextTurn(roomId);
            }
        }, 1000);
    }

    function handleNextTurn(roomId) {
        const room = rooms[roomId];
        if (!room) return;
        const gd = room.gameData;

        gd.isBreak = true;
        let breakTime = 3; // Shorter break time since turns pass faster
        const nextPlayer = room.players[gd.currentPlayerIndex];
        
        io.to(roomId).emit('breakTime', { nextPlayer: nextPlayer.name, time: breakTime });

        let interval = setInterval(() => {
            breakTime--;
            if (breakTime <= 0) {
                clearInterval(interval);
                startTurn(roomId);
            }
        }, 1000);
    }

    function endGame(roomId) {
        const room = rooms[roomId];
        if (!room) return;
        room.state = 'ended';
        io.to(roomId).emit('gameOver', { players: room.players });
    }

    // Disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const roomId = socket.roomId;
        if (roomId && rooms[roomId]) {
            const room = rooms[roomId];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[roomId];
            } else {
                if (room.host === socket.id) {
                    room.host = room.players[0].id; // Reassign host
                }
                io.to(roomId).emit('playerJoined', room.players);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
