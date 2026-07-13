// HTML要素を取得して、JavaScriptから操作できるようにする
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const statusEl = document.getElementById('status');
const restartButton = document.getElementById('restartButton');
const stageBadge = document.getElementById('stageBadge');
const stageNameEl = document.getElementById('stageName');
const stageButtons = Array.from(document.querySelectorAll('.stage-button'));

// 世界と描画の基本サイズ
let worldWidth = 2200;
const worldHeight = 420;
const gravity = 0.32;
const moveSpeed = 3.6;
const jumpPower = 9.0;

// プレイヤーの基本情報
const player = {
  width: 26,
  height: 44,
  x: 90,
  y: 336,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
};

// ステージ要素をまとめておく配列
const platforms = [];
const enemies = [];
const coins = [];

// ゴールの情報
let goal = {
  x: 0,
  y: 0,
  width: 42,
  height: 92,
};

// ゲームの状態を管理する変数
let score = 0;
let lives = 3;
let state = 'ready';
let cameraX = 0;
let keys = {};
let currentStageIndex = 0;

// マップをまとめた配列
const stages = [
  {
    id: 1,
    name: 'Forest Run',
    badge: 'Stage 1',
    worldWidth: 2200,
    playerStart: { x: 90, y: 336 },
    goal: { x: 2040, y: 248, width: 42, height: 92 },
    colors: {
      skyTop: '#8fd3ff',
      skyMiddle: '#fef4d7',
      skyBottom: '#e8f5d9',
      ground: '#7acb7e',
      platform: '#4e7b5d',
      platformAccent: '#91cba5',
      goal: '#385f8d',
      enemy: '#e65b5b',
      coin: '#f8c84f',
      player: '#2f4f6f',
    },
    platforms: [
      { x: 0, y: 390, width: 2200, height: 30 },
      { x: 180, y: 332, width: 150, height: 14 },
      { x: 400, y: 292, width: 140, height: 14 },
      { x: 650, y: 320, width: 120, height: 14 },
      { x: 900, y: 270, width: 150, height: 14 },
      { x: 1180, y: 320, width: 140, height: 14 },
      { x: 1450, y: 270, width: 140, height: 14 },
      { x: 1720, y: 320, width: 160, height: 14 },
    ],
    enemies: [
      { x: 460, y: 268, width: 24, height: 24, vx: 1.2, rangeLeft: 420, rangeRight: 540 },
      { x: 980, y: 246, width: 24, height: 24, vx: 1.4, rangeLeft: 930, rangeRight: 1080 },
      { x: 1540, y: 246, width: 24, height: 24, vx: 1.1, rangeLeft: 1490, rangeRight: 1620 },
    ],
    coins: [
      { x: 240, y: 292, width: 12, height: 12, collected: false },
      { x: 470, y: 248, width: 12, height: 12, collected: false },
      { x: 710, y: 280, width: 12, height: 12, collected: false },
      { x: 970, y: 230, width: 12, height: 12, collected: false },
      { x: 1250, y: 280, width: 12, height: 12, collected: false },
      { x: 1520, y: 230, width: 12, height: 12, collected: false },
      { x: 1800, y: 280, width: 12, height: 12, collected: false },
    ],
  },
  {
    id: 2,
    name: 'Cave Dash',
    badge: 'Stage 2',
    worldWidth: 2400,
    playerStart: { x: 90, y: 336 },
    goal: { x: 2230, y: 220, width: 42, height: 92 },
    colors: {
      skyTop: '#6f7999',
      skyMiddle: '#d5d2e7',
      skyBottom: '#f0e6db',
      ground: '#6b6f7e',
      platform: '#4c4b57',
      platformAccent: '#8a8797',
      goal: '#7f4f2b',
      enemy: '#c44d4d',
      coin: '#fcd66f',
      player: '#2a4d6d',
    },
    platforms: [
      { x: 0, y: 390, width: 2400, height: 30 },
      { x: 200, y: 340, width: 120, height: 14 },
      { x: 420, y: 300, width: 140, height: 14 },
      { x: 650, y: 260, width: 100, height: 14 },
      { x: 880, y: 320, width: 150, height: 14 },
      { x: 1160, y: 270, width: 120, height: 14 },
      { x: 1420, y: 320, width: 160, height: 14 },
      { x: 1700, y: 250, width: 110, height: 14 },
      { x: 1950, y: 320, width: 120, height: 14 },
    ],
    enemies: [
      { x: 460, y: 276, width: 24, height: 24, vx: 1.5, rangeLeft: 420, rangeRight: 560 },
      { x: 1000, y: 296, width: 24, height: 24, vx: 1.3, rangeLeft: 960, rangeRight: 1120 },
      { x: 1760, y: 226, width: 24, height: 24, vx: 1.2, rangeLeft: 1720, rangeRight: 1820 },
    ],
    coins: [
      { x: 240, y: 300, width: 12, height: 12, collected: false },
      { x: 470, y: 260, width: 12, height: 12, collected: false },
      { x: 700, y: 220, width: 12, height: 12, collected: false },
      { x: 940, y: 280, width: 12, height: 12, collected: false },
      { x: 1240, y: 230, width: 12, height: 12, collected: false },
      { x: 1480, y: 280, width: 12, height: 12, collected: false },
      { x: 1760, y: 210, width: 12, height: 12, collected: false },
    ],
  },
  {
    id: 3,
    name: 'Sky Bridge',
    badge: 'Stage 3',
    worldWidth: 2600,
    playerStart: { x: 90, y: 336 },
    goal: { x: 2420, y: 180, width: 42, height: 92 },
    colors: {
      skyTop: '#7dc5ff',
      skyMiddle: '#fff4cf',
      skyBottom: '#dff4ff',
      ground: '#7dcf8a',
      platform: '#5d7f64',
      platformAccent: '#8fd1a4',
      goal: '#3a5f8f',
      enemy: '#d96c3d',
      coin: '#ffd24f',
      player: '#2d475f',
    },
    platforms: [
      { x: 0, y: 390, width: 2600, height: 30 },
      { x: 180, y: 340, width: 120, height: 14 },
      { x: 360, y: 300, width: 140, height: 14 },
      { x: 600, y: 260, width: 100, height: 14 },
      { x: 820, y: 220, width: 140, height: 14 },
      { x: 1080, y: 300, width: 120, height: 14 },
      { x: 1320, y: 250, width: 140, height: 14 },
      { x: 1600, y: 200, width: 110, height: 14 },
      { x: 1850, y: 280, width: 140, height: 14 },
      { x: 2140, y: 240, width: 120, height: 14 },
    ],
    enemies: [
      { x: 400, y: 276, width: 24, height: 24, vx: 1.3, rangeLeft: 360, rangeRight: 500 },
      { x: 900, y: 196, width: 24, height: 24, vx: 1.2, rangeLeft: 860, rangeRight: 980 },
      { x: 1680, y: 176, width: 24, height: 24, vx: 1.1, rangeLeft: 1640, rangeRight: 1760 },
    ],
    coins: [
      { x: 220, y: 300, width: 12, height: 12, collected: false },
      { x: 420, y: 260, width: 12, height: 12, collected: false },
      { x: 660, y: 220, width: 12, height: 12, collected: false },
      { x: 900, y: 180, width: 12, height: 12, collected: false },
      { x: 1160, y: 260, width: 12, height: 12, collected: false },
      { x: 1420, y: 210, width: 12, height: 12, collected: false },
      { x: 1880, y: 240, width: 12, height: 12, collected: false },
      { x: 2200, y: 200, width: 12, height: 12, collected: false },
    ],
  },
];

function getCurrentStage() {
  return stages[currentStageIndex];
}

function updateStageUI() {
  const stage = getCurrentStage();
  stageBadge.textContent = stage.badge;
  stageNameEl.textContent = stage.name;
  stageButtons.forEach((button, index) => {
    button.classList.toggle('active', index === currentStageIndex);
  });
}

// ゲームを初期状態に戻す関数
function resetGame() {
  const stage = getCurrentStage();
  player.x = stage.playerStart.x;
  player.y = stage.playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;

  score = 0;
  lives = 3;
  cameraX = 0;
  worldWidth = stage.worldWidth;
  platforms.length = 0;
  enemies.length = 0;
  coins.length = 0;

  buildWorld();
  updateScore();
  updateLives();
  updateStageUI();
  statusEl.textContent = `${stage.name} 準備中`;
  state = 'ready';
}

// ステージを作る関数
function buildWorld() {
  const stage = getCurrentStage();
  platforms.push(...stage.platforms.map((platform) => ({ ...platform })));
  enemies.push(...stage.enemies.map((enemy) => ({ ...enemy })));
  coins.push(...stage.coins.map((coin) => ({ ...coin })));
  goal = { ...stage.goal };
}

// 得点表示を画面に反映する関数
function updateScore() {
  scoreEl.textContent = score;
}

// 残機表示を画面に反映する関数
function updateLives() {
  livesEl.textContent = lives;
}

// ゲームを開始する関数
function startGame() {
  if (state === 'gameover') {
    resetGame();
  }

  state = 'playing';
  statusEl.textContent = `${getCurrentStage().name} ゲーム中`;
}

// キーボード入力を処理する関数
function handleInput() {
  let moving = false;

  if (keys.ArrowLeft || keys.KeyA) {
    player.vx = -moveSpeed;
    player.facing = -1;
    moving = true;
  }

  if (keys.ArrowRight || keys.KeyD) {
    player.vx = moveSpeed;
    player.facing = 1;
    moving = true;
  }

  if (!moving) {
    player.vx *= 0.82;
  }

  if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.onGround) {
    player.vy = -jumpPower;
    player.onGround = false;
  }
}

// 物理演算を進める関数
function updatePhysics() {
  player.vy += gravity;

  player.x += player.vx;
  resolveHorizontalCollisions();

  player.y += player.vy;
  resolveVerticalCollisions();

  if (player.y > worldHeight + 120) {
    loseLife('落下しました');
  }
}

// 横方向の当たり判定を処理する関数
function resolveHorizontalCollisions() {
  platforms.forEach((platform) => {
    if (!isColliding(player, platform)) return;

    if (player.vx > 0) {
      player.x = platform.x - player.width;
    } else if (player.vx < 0) {
      player.x = platform.x + platform.width;
    }

    player.vx = 0;
  });
}

// 縦方向の当たり判定を処理する関数
function resolveVerticalCollisions() {
  player.onGround = false;

  platforms.forEach((platform) => {
    if (!isColliding(player, platform)) return;

    if (player.vy >= 0) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.y = platform.y + platform.height;
      player.vy = 0;
    }
  });
}

// 2つの矩形が重なっているか調べる関数
function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// 敵を動かす関数
function updateEnemies() {
  enemies.forEach((enemy) => {
    enemy.x += enemy.vx;

    if (enemy.x <= enemy.rangeLeft || enemy.x >= enemy.rangeRight) {
      enemy.vx *= -1;
    }

    if (isColliding(player, enemy)) {
      loseLife('敵に当たりました');
    }
  });
}

// コインを拾う関数
function collectCoins() {
  coins.forEach((coin) => {
    if (coin.collected) return;

    if (isColliding(player, coin)) {
      coin.collected = true;
      score += 10;
      updateScore();
    }
  });
}

// 残機を減らして、状態を切り替える関数
function loseLife(reason) {
  if (state !== 'playing') return;

  lives -= 1;
  updateLives();

  if (lives <= 0) {
    state = 'gameover';
    statusEl.textContent = 'ゲームオーバー';
    return;
  }

  player.x = getCurrentStage().playerStart.x;
  player.y = getCurrentStage().playerStart.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  cameraX = 0;
  state = 'lost';
  statusEl.textContent = `${reason} 残り${lives}機`;
}

// ゴールに到達したか調べる関数
function checkGoal() {
  if (
    player.x + player.width >= goal.x &&
    player.x <= goal.x + goal.width &&
    player.y + player.height >= goal.y &&
    player.y <= goal.y + goal.height
  ) {
    state = 'won';
    statusEl.textContent = `${getCurrentStage().name} クリア！`;
  }
}

// カメラ位置を更新する関数
function updateCamera() {
  const targetX = player.x - canvas.width / 2 + player.width / 2;
  const maxX = Math.max(0, worldWidth - canvas.width);
  cameraX = Math.max(0, Math.min(maxX, targetX));
}

// 背景を描画する関数
function drawBackground() {
  const stage = getCurrentStage();
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, stage.colors.skyTop);
  sky.addColorStop(0.6, stage.colors.skyMiddle);
  sky.addColorStop(1, stage.colors.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#cce9b8';
  ctx.beginPath();
  ctx.moveTo(0, 360);
  for (let x = 0; x <= canvas.width + 60; x += 80) {
    const wave = Math.sin((x + cameraX * 0.05) / 90) * 12 + 330;
    ctx.lineTo(x, wave);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = stage.colors.ground;
  ctx.fillRect(0, 360, canvas.width, 60);
}

// 足場を描画する関数
function drawPlatforms() {
  const stage = getCurrentStage();
  platforms.forEach((platform) => {
    const drawX = platform.x - cameraX;
    const drawY = platform.y;

    ctx.fillStyle = stage.colors.platform;
    ctx.fillRect(drawX, drawY, platform.width, platform.height);
    ctx.fillStyle = stage.colors.platformAccent;
    ctx.fillRect(drawX, drawY, platform.width, 4);
  });
}

// 敵を描画する関数
function drawEnemies() {
  const stage = getCurrentStage();
  enemies.forEach((enemy) => {
    const drawX = enemy.x - cameraX;
    ctx.fillStyle = stage.colors.enemy;
    ctx.fillRect(drawX, enemy.y, enemy.width, enemy.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX + 6, enemy.y + 6, 5, 5);
    ctx.fillRect(drawX + 13, enemy.y + 6, 5, 5);
  });
}

// コインを描画する関数
function drawCoins() {
  const stage = getCurrentStage();
  coins.forEach((coin) => {
    if (coin.collected) return;
    const drawX = coin.x - cameraX + coin.width / 2;
    const drawY = coin.y + coin.height / 2;

    ctx.fillStyle = stage.colors.coin;
    ctx.beginPath();
    ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ゴールを描画する関数
function drawGoal() {
  const stage = getCurrentStage();
  const drawX = goal.x - cameraX;
  ctx.fillStyle = stage.colors.goal;
  ctx.fillRect(drawX, goal.y, goal.width, goal.height);
  ctx.fillStyle = '#f8c84f';
  ctx.fillRect(drawX + 12, goal.y + 10, 10, 12);
  ctx.fillRect(drawX + 22, goal.y + 10, 10, 12);
}

// プレイヤーを描画する関数
function drawPlayer() {
  const stage = getCurrentStage();
  const drawX = player.x - cameraX;

  ctx.fillStyle = stage.colors.player;
  ctx.fillRect(drawX, player.y, player.width, player.height);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(drawX + 6, player.y + 10, 5, 5);
  ctx.fillRect(drawX + 15, player.y + 10, 5, 5);
  ctx.fillRect(drawX + 8, player.y + 24, 10, 4);
}

// 画面上に状態メッセージを表示する関数
function drawOverlay() {
  if (state === 'ready') {
    ctx.fillStyle = 'rgba(10, 24, 38, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Press Enter or Space to Start', 190, 180);
    ctx.font = '16px sans-serif';
    ctx.fillText('矢印キーまたは WASD で移動して、ゴールへ進みましょう。', 140, 214);
  }

  if (state === 'won') {
    ctx.fillStyle = 'rgba(10, 24, 38, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Clear!', 340, 180);
    ctx.font = '16px sans-serif';
    ctx.fillText('ステージ選択またはもう一度遊ぶボタンで再挑戦できます。', 130, 214);
  }

  if (state === 'lost') {
    ctx.fillStyle = 'rgba(10, 24, 38, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Life Lost', 310, 180);
    ctx.font = '16px sans-serif';
    ctx.fillText('Enter または Space でもう一度スタートしてください。', 180, 214);
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(10, 24, 38, 0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Game Over', 310, 180);
    ctx.font = '16px sans-serif';
    ctx.fillText('もう一度遊ぶボタンで最初から始められます。', 185, 214);
  }
}

// 画面全体を描画する関数
function draw() {
  drawBackground();
  drawPlatforms();
  drawCoins();
  drawEnemies();
  drawGoal();
  drawPlayer();
  drawOverlay();
}

// 1フレームごとに動かす処理をまとめた関数
function loop() {
  if (state === 'playing') {
    handleInput();
    updatePhysics();
    updateEnemies();
    collectCoins();
    checkGoal();
    updateCamera();
  }

  draw();
  requestAnimationFrame(loop);
}

// キーボード入力を受け取る処理
window.addEventListener('keydown', (event) => {
  keys[event.code] = true;

  if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyD'].includes(event.code)) {
    event.preventDefault();
  }

  if ((event.code === 'Enter' || event.code === 'Space') && state !== 'playing') {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.code] = false;
});

restartButton.addEventListener('click', () => {
  resetGame();
  startGame();
});

stageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    currentStageIndex = Number(button.dataset.stage);
    resetGame();
  });
});

resetGame();
loop();
