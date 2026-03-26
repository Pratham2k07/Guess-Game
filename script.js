let number;
let attempts = 0;
let maxAttempts = Infinity;
let range = 100;
let gameOver = false;

function startGame(level) {
    document.getElementById("difficulty").style.display = "none";
    document.getElementById("game").style.display = "block";

    attempts = 0;
    gameOver = false;

    if (level === "easy") {
        range = 50;
        maxAttempts = Infinity;
    } 
    else if (level === "medium") {
        range = 75;
        maxAttempts = Infinity;
    } 
    else {
        range = 100;
        maxAttempts = 5;
    }

    number = Math.floor(Math.random() * range) + 1;

    document.getElementById("rangeText").innerText = "Guess between 1 and " + range;
    document.getElementById("result").innerText = "Game started!";
    document.getElementById("attempts").innerText = "Attempts: 0";

    document.getElementById("guessInput").focus(); // auto focus
}

function checkGuess() {
    if (gameOver) return;

    let guess = document.getElementById("guessInput").value;
    guess = Number(guess);

    if (!guess) {
        document.getElementById("result").innerText = "⚠️ Enter a number!";
        return;
    }

    attempts++;

    if (guess > number) {
        document.getElementById("result").innerText = "Too high 🔼";
    } 
    else if (guess < number) {
        document.getElementById("result").innerText = "Too low 🔽";
    } 
    else {
        document.getElementById("result").innerText = "🎉 You Win!";
        gameOver = true;
        return;
    }

    if (attempts >= maxAttempts) {
        document.getElementById("result").innerText = "❌ You Failed! Number was " + number;
        gameOver = true;
    }

    if (maxAttempts === Infinity) {
        document.getElementById("attempts").innerText = "Attempts: " + attempts;
    } else {
        document.getElementById("attempts").innerText =
            "Attempts: " + attempts + " / " + maxAttempts;
    }

    // Clear input after guess
    document.getElementById("guessInput").value = "";
}

function restartGame() {
    document.getElementById("game").style.display = "none";
    document.getElementById("difficulty").style.display = "block";

    document.getElementById("guessInput").value = "";
    document.getElementById("result").innerText = "";
    document.getElementById("attempts").innerText = "";
}

/* 🔥 ENTER KEY SUPPORT */
document.getElementById("guessInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        checkGuess();
    }
});