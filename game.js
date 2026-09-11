const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const livesElement = document.getElementById("lives");
const levelElement = document.getElementById("level");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");

const keys = {
  left: false,
  right: false,
  shoot: false
};

const game = {
  running: false,
  score: 0,
  lives: 3,
  level: 1,
  lastShotTime: 0,
  lastEnemyShotTime: 0,
  enemyDirection: 1,
  enemySpeed: 0.45,
  enemyDropDistance: 24,
  player: null,
  bullets: [],
  enemyBullets: [],
  enemies: []
};

function createPlayer() {
  return {
    width: 48,
    height: 28,
    x: canvas.width / 2 - 24,
    y: canvas.height - 65,
    speed: 6,
    cooldown: 280
  };
}

function createEnemies() {
  const enemies = [];
  const rows = 5;
  const columns = 10;
  const enemyWidth = 42;
  const enemyHeight = 28;
  const gapX = 24;
  const gapY = 20;
  const formationWidth = columns * enemyWidth + (columns - 1) * gapX;
  const startX = (canvas.width - formationWidth) / 2;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      enemies.push({
        x: startX + column * (enemyWidth + gapX),
        y: 70 + row * (enemyHeight + gapY),
        width: enemyWidth,
        height: enemyHeight,
        row,
        alive: true
      });
    }
  }

  return enemies;
}

function resetGame() {
  game.score = 0;
  game.lives = 3;
  game.level = 1;
  game.enemySpeed = 0.45;
  game.enemyDirection = 1;
  game.bullets = [];
  game.enemyBullets = [];
  game.player = createPlayer();
  game.enemies = createEnemies();
  updateHud();
}

function startGame() {
  resetGame();
  game.running = true;
  overlay.classList.add("hidden");
  requestAnimationFrame(gameLoop);
}

function restartGame() {
  startGame();
}

function updateHud() {
  scoreElement.textContent = game.score;
  livesElement.textContent = game.lives;
  levelElement.textContent = game.level;
}

function endGame(title, message) {
  game.running = false;

  overlay.innerHTML = `
    <div class="overlay-card">
      <p class="eyebrow">GAME OVER</p>
      <h2>${title}</h2>
      <p>${message}</p>
      <button id="play-again-button" class="start-button" type="button">
        Play Again
      </button>
    </div>
  `;

  overlay.classList.remove("hidden");

  document
    .getElementById("play-again-button")
    .addEventListener("click", startGame);
}

function movePlayer() {
  if (keys.left) {
    game.player.x -= game.player.speed;
  }

  if (keys.right) {
    game.player.x += game.player.speed;
  }

  game.player.x = Math.max(
    0,
    Math.min(canvas.width - game.player.width, game.player.x)
  );
}

function shootPlayerBullet() {
  const now = Date.now();

  if (!keys.shoot || now - game.lastShotTime < game.player.cooldown) {
    return;
  }

  game.bullets.push({
    x: game.player.x + game.player.width / 2 - 3,
    y: game.player.y - 12,
    width: 6,
    height: 14,
    speed: 8
  });

  game.lastShotTime = now;
}

function moveBullets() {
  game.bullets.forEach((bullet) => {
    bullet.y -= bullet.speed;
  });

  game.enemyBullets.forEach((bullet) => {
    bullet.y += bullet.speed;
  });

  game.bullets = game.bullets.filter((bullet) => bullet.y + bullet.height > 0);
  game.enemyBullets = game.enemyBullets.filter(
    (bullet) => bullet.y < canvas.height
  );
}

function moveEnemies() {
  const livingEnemies = game.enemies.filter((enemy) => enemy.alive);

  if (livingEnemies.length === 0) {
    nextLevel();
    return;
  }

  let reachedEdge = false;

  livingEnemies.forEach((enemy) => {
    enemy.x += game.enemySpeed * game.enemyDirection;

    if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
      reachedEdge = true;
    }
  });

  if (reachedEdge) {
    game.enemyDirection *= -1;

    livingEnemies.forEach((enemy) => {
      enemy.y += game.enemyDropDistance;
    });
  }

  const enemyReachedBottom = livingEnemies.some(
    (enemy) => enemy.y + enemy.height >= game.player.y
  );

  if (enemyReachedBottom) {
    endGame("The invaders landed", `Final score: ${game.score}`);
  }
}

function enemyShoot() {
  const now = Date.now();
  const delay = Math.max(350, 1100 - game.level * 85);

  if (now - game.lastEnemyShotTime < delay) {
    return;
  }

  const livingEnemies = game.enemies.filter((enemy) => enemy.alive);

  if (livingEnemies.length === 0) {
    return;
  }

  const shooter = livingEnemies[Math.floor(Math.random() * livingEnemies.length)];

  game.enemyBullets.push({
    x: shooter.x + shooter.width / 2 - 3,
    y: shooter.y + shooter.height,
    width: 6,
    height: 14,
    speed: 3.5 + game.level * 0.3
  });

  game.lastEnemyShotTime = now;
}

function isColliding(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function checkCollisions() {
  for (const bullet of game.bullets) {
    for (const enemy of game.enemies) {
      if (enemy.alive && isColliding(bullet, enemy)) {
        enemy.alive = false;
        bullet.y = -100;
        game.score += 10 + (4 - enemy.row) * 5;
        updateHud();
        break;
      }
    }
  }

  for (const bullet of game.enemyBullets) {
    if (isColliding(bullet, game.player)) {
      bullet.y = canvas.height + 100;
      game.lives -= 1;
      updateHud();

      if (game.lives <= 0) {
        endGame("Earth has fallen", `Final score: ${game.score}`);
      }
    }
  }
}

function nextLevel() {
  game.level += 1;
  game.enemySpeed += 0.18;
  game.enemyDirection = 1;
  game.bullets = [];
  game.enemyBullets = [];
  game.enemies = createEnemies();
  updateHud();
}

function drawPlayer() {
  const player = game.player;

  ctx.save();
  ctx.fillStyle = "#62b8ff";
  ctx.shadowColor = "#62b8ff";
  ctx.shadowBlur = 14;

  ctx.fillRect(player.x + 18, player.y, 12, 8);
  ctx.fillRect(player.x + 10, player.y + 8, 28, 10);
  ctx.fillRect(player.x, player.y + 18, 48, 10);

  ctx.restore();
}

function drawEnemy(enemy) {
  const colors = ["#ff4fd8", "#ff7a5f", "#ffe75f", "#62ff9b", "#62b8ff"];

  ctx.save();
  ctx.fillStyle = colors[enemy.row];
  ctx.shadowColor = colors[enemy.row];
  ctx.shadowBlur = 10;

  ctx.fillRect(enemy.x + 8, enemy.y, 26, 5);
  ctx.fillRect(enemy.x + 3, enemy.y + 5, 36, 7);
  ctx.fillRect(enemy.x, enemy.y + 12, 42, 8);
  ctx.fillRect(enemy.x + 7, enemy.y + 20, 8, 8);
  ctx.fillRect(enemy.x + 27, enemy.y + 20, 8, 8);

  ctx.fillStyle = "#050816";
  ctx.fillRect(enemy.x + 9, enemy.y + 10, 5, 5);
  ctx.fillRect(enemy.x + 28, enemy.y + 10, 5, 5);

  ctx.restore();
}

function drawBullet(bullet, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  ctx.restore();
}

function drawGroundLine() {
  ctx.save();
  ctx.strokeStyle = "rgba(98, 255, 155, 0.45)";
  ctx.setLineDash([8, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, canvas.height - 42);
  ctx.lineTo(canvas.width - 20, canvas.height - 42);
  ctx.stroke();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawGroundLine();
  drawPlayer();

  game.enemies.forEach((enemy) => {
    if (enemy.alive) {
      drawEnemy(enemy);
    }
  });

  game.bullets.forEach((bullet) => drawBullet(bullet, "#62ff9b"));
  game.enemyBullets.forEach((bullet) => drawBullet(bullet, "#ff4fd8"));
}

function update() {
  movePlayer();
  shootPlayerBullet();
  moveBullets();
  moveEnemies();
  enemyShoot();
  checkCollisions();
}

function gameLoop() {
  if (!game.running) {
    return;
  }

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function setKeyState(event, isPressed) {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "a", "d"].includes(key)) {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") {
    keys.left = isPressed;
  }

  if (key === "arrowright" || key === "d") {
    keys.right = isPressed;
  }

  if (key === " ") {
    keys.shoot = isPressed;
  }
}

document.addEventListener("keydown", (event) => setKeyState(event, true));
document.addEventListener("keyup", (event) => setKeyState(event, false));

function addHoldControls(buttonId, keyName) {
  const button = document.getElementById(buttonId);

  const press = (event) => {
    event.preventDefault();
    keys[keyName] = true;
  };

  const release = (event) => {
    event.preventDefault();
    keys[keyName] = false;
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointerleave", release);
  button.addEventListener("pointercancel", release);
}

addHoldControls("left-button", "left");
addHoldControls("right-button", "right");
addHoldControls("shoot-button", "shoot");

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", restartGame);

resetGame();
draw();
