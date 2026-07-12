const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const statusEl = document.getElementById('status');
const restartButton = document.getElementById('restartButton');

const paddle = {
  width: 80,
  height: 12,
  x: canvas.width / 2 - 40,
  y: canvas.height - 24,
  speed: 7,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height - 40,
  radius: 7,
  speedX: 4,
  speedY: -4,
};

const bricks = [];
const brickRows = 4;
const brickCols = 6;
const brickWidth = 60;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 40;
const brickOffsetLeft = 30;

let score = 0;
let running = false;
let keys = {};

function initBricks() {
  bricks.length = 0;
  for (let row = 0; row < brickRows; row += 1) {
    for (let col = 0; col < brickCols; col += 1) {
      bricks.push({
        x: col * (brickWidth + brickPadding) + brickOffsetLeft,
        y: row * (brickHeight + brickPadding) + brickOffsetTop,
        width: brickWidth,
        height: brickHeight,
        alive: true,
      });
    }
  }
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height - 40;
  ball.speedX = 4;
  ball.speedY = -4;
  running = false;
  statusEl.textContent = 'スペースで開始';
}

function updateScore() {
  scoreEl.textContent = score;
}

function drawBackground() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

function drawPaddle() {
  ctx.fillStyle = '#111111';
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#111111';
  ctx.fill();
  ctx.closePath();
}

function drawBricks() {
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    ctx.fillStyle = '#111111';
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    ctx.strokeStyle = '#111111';
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  });
}

function updatePaddle() {
  if (keys.ArrowLeft || keys.KeyA) {
    paddle.x -= paddle.speed;
  }
  if (keys.ArrowRight || keys.KeyD) {
    paddle.x += paddle.speed;
  }

  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

function updateBall() {
  if (!running) return;

  ball.x += ball.speedX;
  ball.y += ball.speedY;

  if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
    ball.speedX *= -1;
  }

  if (ball.y - ball.radius <= 0) {
    ball.speedY *= -1;
  }

  if (
    ball.x > paddle.x &&
    ball.x < paddle.x + paddle.width &&
    ball.y + ball.radius >= paddle.y &&
    ball.y - ball.radius <= paddle.y + paddle.height
  ) {
    ball.speedY *= -1;
    ball.y = paddle.y - ball.radius;
  }

  bricks.forEach((brick) => {
    if (!brick.alive) return;
    const hit =
      ball.x + ball.radius > brick.x &&
      ball.x - ball.radius < brick.x + brick.width &&
      ball.y + ball.radius > brick.y &&
      ball.y - ball.radius < brick.y + brick.height;

    if (hit) {
      brick.alive = false;
      score += 10;
      updateScore();
      ball.speedY *= -1;
    }
  });

  if (ball.y - ball.radius > canvas.height) {
    resetBall();
    statusEl.textContent = 'はずしました。もう一度！';
    return;
  }

  if (bricks.every((brick) => !brick.alive)) {
    running = false;
    statusEl.textContent = 'クリア！';
  }
}

function draw() {
  drawBackground();
  drawBricks();
  drawPaddle();
  drawBall();
}

function loop() {
  updatePaddle();
  updateBall();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (event) => {
  keys[event.code] = true;
  if (event.code === 'Space') {
    event.preventDefault();
    if (!running && !bricks.every((brick) => !brick.alive)) {
      running = true;
      statusEl.textContent = 'ゲーム中';
    }
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

restartButton.addEventListener('click', () => {
  score = 0;
  initBricks();
  resetBall();
  updateScore();
});

initBricks();
updateScore();
resetBall();
loop();
