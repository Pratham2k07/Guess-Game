const socket = io();

let currentUsername = "";
let currentRoomCode = "";
let isHost = false;
let players = [];
let gd = null; // Game data

// UI Elements
const startScreen = document.getElementById("startScreen");
const lobbyScreen = document.getElementById("lobbyScreen");
const gameScreen = document.getElementById("gameScreen");
const endScreen = document.getElementById("endScreen");

function getUsername() {
    const val = document.getElementById("username").value.trim();
    if (!val) {
        showError("Please enter a username");
        return null;
    }
    return val;
}

function showError(msg) {
    const err = document.getElementById("startError");
    err.innerText = msg;
    err.classList.remove("hidden");
    setTimeout(() => err.classList.add("hidden"), 3000);
}

function createRoom() {
    const user = getUsername();
    if (!user) return;
    currentUsername = user;

    socket.emit("createRoom", { username: user }, (res) => {
        if (res.success) {
            isHost = true;
            currentRoomCode = res.roomCode;
            players = res.players;
            showLobby();
        } else {
            showError(res.message);
        }
    });
}

function joinRoom() {
    const user = getUsername();
    if (!user) return;
    const code = document.getElementById("joinRoomCode").value.trim();
    if (!code) {
        showError("Please enter a room code");
        return;
    }
    currentUsername = user;

    socket.emit("joinRoom", { roomCode: code, username: user }, (res) => {
        if (res.success) {
            isHost = false;
            currentRoomCode = res.roomCode;
            players = res.players;
            showLobby();
        } else {
            showError(res.message);
        }
    });
}

function showLobby() {
    startScreen.classList.add("hidden");
    lobbyScreen.classList.remove("hidden");
    document.getElementById("roomCodeDisplay").innerText = currentRoomCode;
    updateLobbyPlayers();

    if (isHost) {
        document.getElementById("hostControls").classList.remove("hidden");
        document.getElementById("waitingMessage").classList.add("hidden");
    } else {
        document.getElementById("hostControls").classList.add("hidden");
        document.getElementById("waitingMessage").classList.remove("hidden");
    }
}

function updateLobbyPlayers() {
    const container = document.getElementById("lobbyPlayers");
    container.innerHTML = "";
    players.forEach(p => {
        const pill = document.createElement("div");
        pill.className = "player-pill";
        pill.innerHTML = `👤 ${p.name}`;
        if (p.name === currentUsername) {
            pill.style.borderColor = "var(--primary)";
            pill.style.color = "var(--primary)";
        }
        container.appendChild(pill);
    });
    updateLeaderboard();
}

function startGame(diff) {
    if (isHost) {
        socket.emit("startGame", { difficulty: diff });
    }
}

// Socket Events
socket.on("playerJoined", (newPlayers) => {
    players = newPlayers;
    updateLobbyPlayers();
});

socket.on("gameStarted", (data) => {
    lobbyScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    document.getElementById("guessHistory").innerHTML = "";
    gd = data;
});

socket.on("turnUpdate", (data) => {
    document.getElementById("playerTurn").innerText = `${data.username}'s Turn`;
    document.getElementById("hint").innerText = `Guess between 1 and ${gd.range}`;
    document.getElementById("timer").innerText = data.timeLeft;
    
    const isMyTurn = data.username === currentUsername;
    document.getElementById("guess").disabled = !isMyTurn;
    document.getElementById("guessBtn").disabled = !isMyTurn;
    
    if (isMyTurn) {
        document.getElementById("guess").focus();
    }
});

socket.on("timerUpdate", (timeLeft) => {
    document.getElementById("timer").innerText = timeLeft;
});

socket.on("breakTime", (data) => {
    document.getElementById("playerTurn").innerText = `Next: ${data.nextPlayer}`;
    document.getElementById("hint").innerText = `Starting in ${data.time}`;
    document.getElementById("timer").innerText = "-";
});

socket.on("guessResult", (data) => {
    players = data.players;
    updateLeaderboard();
    
    const history = document.getElementById("guessHistory");
    const item = document.createElement("div");
    item.className = "history-item";
    
    let resultMsg = "";
    if (data.result === "correct") {
        resultMsg = "guessed correctly! 🎉";
        if (data.username === currentUsername) playSound();
        addShakeEffect(document.getElementById("playerTurn"), false); // Success effect
    } else if (data.result === "too_high") {
        resultMsg = "guessed too high.";
        if (data.username === currentUsername) addShakeEffect(document.getElementById("guess"), true);
    } else if (data.result === "too_low") {
        resultMsg = "guessed too low.";
        if (data.username === currentUsername) addShakeEffect(document.getElementById("guess"), true);
    } else if (data.result === "out_of_attempts") {
        resultMsg = "ran out of attempts!";
        if (data.username === currentUsername) playSound();
    }

    item.innerHTML = `<strong>${data.username}</strong> guessed <b>${data.guess}</b> - ${resultMsg}`;
    history.prepend(item);
    
    document.getElementById("hint").innerText = resultMsg;
});

socket.on("turnTimeout", (data) => {
    const history = document.getElementById("guessHistory");
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<strong>${data.username}</strong> ran out of time!`;
    history.prepend(item);
    if (data.username === currentUsername) playSound();
});

socket.on("gameOver", (data) => {
    gameScreen.classList.add("hidden");
    endScreen.classList.remove("hidden");
    players = data.players;
    players.sort((a,b) => b.score - a.score);
    
    document.getElementById("winnerText").innerText = "🏆 Winner: " + (players[0]?.name || "Nobody");
    
    let html = "";
    players.forEach((p, i) => {
        html += `<p>${i+1}. ${p.name} - ${p.score}</p>`;
    });
    document.getElementById("finalLeaderboard").innerHTML = html;
});

// Helpers
function makeGuess() {
    const input = document.getElementById("guess");
    const guess = input.value.trim();
    if (guess !== "") {
        socket.emit("makeGuess", guess);
        input.value = "";
    }
}

function updateLeaderboard() {
    let html = "";
    players.forEach(p => {
        html += `<div class="player-score ${p.name === currentUsername ? 'active' : ''}">
            <span>${p.name}</span>
            <span>${p.score}</span>
        </div>`;
    });
    document.getElementById("leaderboard").innerHTML = html;
}

function playSound() {
    const s = document.getElementById("alertSound");
    s.currentTime = 0;
    s.play().catch(()=>{});
}

function goHome() {
    location.reload();
}

function addShakeEffect(element, isError) {
    element.animate([
        { transform: 'translateX(0)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-10px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(0)' }
    ], {
        duration: 400,
        iterations: 1
    });
}

// Enter Key Support
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const active = document.activeElement;
        if (active.id === "guess") {
            makeGuess();
        } else if (active.id === "username" || active.id === "joinRoomCode") {
            const code = document.getElementById("joinRoomCode").value.trim();
            if (code) {
                joinRoom();
            } else {
                createRoom();
            }
        }
    }
});

// URL Parameter checking for Invite Links
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomFromUrl = urlParams.get('room');
    if (roomFromUrl) {
        document.getElementById("joinRoomCode").value = roomFromUrl;
        document.getElementById("username").focus();
        
        // Clean up UI for a streamlined join experience
        document.getElementById("createRoomBtn").classList.add("hidden");
        document.getElementById("orDivider").classList.add("hidden");
        document.getElementById("joinRoomCode").setAttribute("readonly", true);
    }
};

function copyShareLink() {
    // If running locally or on a server, this gets the base URL
    const link = window.location.origin + window.location.pathname + "?room=" + currentRoomCode;
    navigator.clipboard.writeText(link).then(() => {
        alert("Invite link copied to clipboard! Share it with your friends.");
    }).catch(err => {
        console.error("Could not copy text: ", err);
    });
}