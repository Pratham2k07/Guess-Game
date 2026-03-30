let players = [];
let scores = [];
let currentPlayer = 0;

let number, maxAttempts, timeLimit;
let attempts = 0;
let timerInterval;
let isBreak = false;

/* CREATE INPUTS */
function createPlayerInputs() {
    let n = document.getElementById("numPlayers").value;
    let container = document.getElementById("playerInputs");
    container.innerHTML = "";

    for (let i = 0; i < n; i++) {
        container.innerHTML += `<input type="text" class="pname" placeholder="Player ${i+1}">`;
    }
}

/* START GAME */
function startGame(difficulty) {
    let inputs = document.getElementsByClassName("pname");

    players = [];
    scores = [];
    currentPlayer = 0;

    for (let i = 0; i < inputs.length; i++) {
        players.push(inputs[i].value || "Player " + (i+1));
        scores.push(0);
    }

    if (difficulty == 1) {
        maxAttempts = 1000;
        timeLimit = 60;
    } else if (difficulty == 2) {
        maxAttempts = 1000;
        timeLimit = 45;
    } else {
        maxAttempts = 5;
        timeLimit = 30;
    }

    window.range = (difficulty == 1) ? 50 : (difficulty == 2) ? 75 : 100;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("game").classList.remove("hidden");

    nextTurn();
}

/* TURN */
function nextTurn() {
    if (currentPlayer >= players.length) {
        endGame();
        return;
    }

    // 🔥 IMPORTANT FIX: NEW NUMBER EVERY PLAYER
    number = Math.floor(Math.random() * window.range) + 1;

    attempts = 0;
    let timeLeft = timeLimit;
    isBreak = false;

    document.getElementById("playerTurn").innerText =
        players[currentPlayer] + "'s Turn";

    document.getElementById("hint").innerText =
        `Guess between 1 and ${window.range}`;

    updateLeaderboard();

    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        document.getElementById("timer").innerText = timeLeft;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            playSound();
            currentPlayer++;
            handleNext();
        }
    }, 1000);

    setTimeout(()=>document.getElementById("guess").focus(),100);
}

/* BREAK */
function breakTime(nextPlayer) {
    isBreak = true;

    let t = 5;
    document.getElementById("playerTurn").innerText =
        `Next: ${players[nextPlayer]}`;

    document.getElementById("hint").innerText = `Starting in ${t}`;

    let interval = setInterval(() => {
        t--;
        document.getElementById("hint").innerText = `Starting in ${t}`;

        if (t <= 0) {
            clearInterval(interval);
            nextTurn();
        }
    }, 1000);
}

function handleNext() {
    if (currentPlayer < players.length) {
        breakTime(currentPlayer);
    } else {
        endGame();
    }
}

/* GUESS */
function makeGuess() {
    if (isBreak) return;

    let input = document.getElementById("guess");
    let guess = input.value;

    if (guess === "") return;

    attempts++;

    if (guess == number) {
        clearInterval(timerInterval);
        scores[currentPlayer] += 100 - attempts*10;
        currentPlayer++;
        handleNext();
    } 
    else if (guess < number) {
        document.getElementById("hint").innerText = "Too low!";
    } 
    else {
        document.getElementById("hint").innerText = "Too high!";
    }

    if (attempts >= maxAttempts && maxAttempts === 5) {
        clearInterval(timerInterval);
        playSound();
        currentPlayer++;
        handleNext();
    }

    input.value = "";
    updateLeaderboard();
}

/* END GAME */
function endGame() {
    document.getElementById("game").classList.add("hidden");
    document.getElementById("endScreen").classList.remove("hidden");

    let arr = players.map((p,i)=>({name:p,score:scores[i]}));
    arr.sort((a,b)=>b.score-a.score);

    document.getElementById("winnerText").innerText =
        "🏆 Winner: " + arr[0].name;

    let html="";
    arr.forEach((p,i)=>{
        html += `<p>${i+1}. ${p.name} - ${p.score}</p>`;
    });

    document.getElementById("finalLeaderboard").innerHTML = html;

    setTimeout(()=>{
        document.getElementById("homeBtn").classList.remove("hidden");
    },5000);
}

function goHome() {
    location.reload();
}

function updateLeaderboard() {
    let html="";
    for (let i=0;i<players.length;i++) {
        html += `<p>${players[i]} : ${scores[i]}</p>`;
    }
    document.getElementById("leaderboard").innerHTML = html;
}

function playSound() {
    let s=document.getElementById("alertSound");
    s.currentTime=0;
    s.play().catch(()=>{});
}

/* ENTER NAV */
document.addEventListener("keydown", function(e) {
    if (e.key !== "Enter" || isBreak) return;

    let active = document.activeElement;

    if (active.id === "numPlayers") {
        createPlayerInputs();
        setTimeout(()=>document.querySelector(".pname")?.focus(),100);
    }
    else if (active.classList.contains("pname")) {
        let inputs = Array.from(document.getElementsByClassName("pname"));
        let index = inputs.indexOf(active);

        if (index < inputs.length - 1) {
            inputs[index + 1].focus();
        } else {
            document.querySelector("button[onclick='startGame(1)']").focus();
        }
    }
    else if (active.id === "guess") {
        makeGuess();
    }
});