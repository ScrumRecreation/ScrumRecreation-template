// このファイル全体を1つのスコープに閉じ込めて、グローバル汚染を避ける
(function () {
  'use strict';

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

  // 60fpsを基準にした1フレームあたりのミリ秒数
  // これを使って、画面のリフレッシュレートが違っても動きの速さを揃える
  const BASE_FRAME_MS = 1000 / 60;
  const MAX_DELTA = 2.5; // タブ切り替え直後などの大きすぎる経過時間を防ぐ上限

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
    animFrame: 0,
    animTimer: 0,
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
  // ステージデータは stage-data.js の `stages` を利用する（このファイルはロジックのみを持つ）

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
    enemies.push(...stage.enemies.map((enemy) => ({ ...enemy, animFrame: 0, animTimer: 0 })));
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
      player.vx = 0;
    }

    if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.onGround) {
      player.vy = -jumpPower;
      player.onGround = false;
    }
  }

  // 物理演算を進める関数
  // dt は前回のフレームからの経過時間（60fpsを 1 とした倍率）
  function updatePhysics(dt) {
    player.vy += gravity * dt;

    player.x += player.vx * dt;
    resolveHorizontalCollisions();

    player.y += player.vy * dt;
    resolveVerticalCollisions();

    if (player.y > worldHeight + 120) {
      loseLife('落下しました');
    }
  }

  function getPlayerAnimationStyle() {
    const design = characterDesign.player;
    if (!player.onGround) {
      return design.animation.jump;
    }
    if (Math.abs(player.vx) > 0.2) {
      return design.animation.walk;
    }
    return design.animation.idle;
  }

  // アニメーションの歩行フレームを進める共通処理
  // プレイヤーと敵の両方から使うことで、同じロジックの重複を避ける
  function advanceAnimationFrame(entity, isMoving, frameDuration, dt) {
    if (isMoving) {
      entity.animTimer += dt;
      if (entity.animTimer > frameDuration) {
        entity.animTimer = 0;
        entity.animFrame = entity.animFrame === 0 ? 1 : 0;
      }
    } else {
      entity.animTimer = 0;
      entity.animFrame = 0;
    }
  }

  // キャラクターの動きに合わせてプレイヤーのアニメーションを進める関数
  function updateAnimation(dt) {
    const style = getPlayerAnimationStyle();
    const isWalking = player.onGround && Math.abs(player.vx) > 0.2;
    advanceAnimationFrame(player, isWalking, style.frameDuration || 5, dt);
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
  function updateEnemies(dt) {
    enemies.forEach((enemy) => {
      enemy.x += enemy.vx * dt;

      if (enemy.x <= enemy.rangeLeft || enemy.x >= enemy.rangeRight) {
        enemy.vx *= -1;
      }

      const isWalking = Math.abs(enemy.vx) > 0.1;
      advanceAnimationFrame(enemy, isWalking, characterDesign.enemy.animation.walk.frameDuration || 6, dt);

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

  // 形を別ファイルの設定から読み込んでキャラクターを描画する関数
  function drawCharacterSprite(kind, x, y, facing = 1, animationStyle = null, animationFrame = 0) {
    const design = characterDesign[kind];
    const shape = design.shape;

    const bodyX = x + shape.torso.offsetX;
    const bodyY = y + shape.torso.offsetY;
    const headX = x + shape.head.offsetX;
    const headY = y + shape.head.offsetY;
    const stepOffset = animationStyle ? (animationFrame === 0 ? 0 : animationStyle.stepOffset) : 0;
    const armOffset = animationStyle ? animationStyle.armOffset : 0;

    // 帽子
    ctx.fillStyle = design.cap;
    ctx.fillRect(headX, headY - 1, shape.head.width, 4);
    ctx.fillStyle = design.capAccent;
    ctx.fillRect(headX + 1, headY, shape.head.width - 2, 2);

    // 顔
    ctx.fillStyle = design.face;
    ctx.fillRect(headX, headY + 3, shape.head.width, shape.head.height - 3);

    // 目
    ctx.fillStyle = design.accent;
    ctx.fillRect(headX + 2, headY + 5, 2, 2);
    ctx.fillRect(headX + 8, headY + 5, 2, 2);

    // 口
    ctx.fillStyle = design.shadow;
    ctx.fillRect(headX + 4, headY + 8, 4, 1);

    // 体
    ctx.fillStyle = design.shirt;
    ctx.fillRect(bodyX, bodyY, shape.torso.width, shape.torso.height - 5);
    ctx.fillStyle = design.pants;
    ctx.fillRect(bodyX, bodyY + shape.torso.height - 5, shape.torso.width, 5);

    // 腕
    ctx.fillStyle = design.body;
    ctx.fillRect(bodyX - shape.arm.width, bodyY + 2 + armOffset, shape.arm.width, shape.arm.height);
    ctx.fillRect(bodyX + shape.torso.width, bodyY + 2 - armOffset, shape.arm.width, shape.arm.height);

    // 脚
    ctx.fillRect(bodyX + 2, bodyY + shape.torso.height + stepOffset, shape.leg.width, shape.leg.height);
    ctx.fillRect(bodyX + shape.torso.width - 6, bodyY + shape.torso.height - stepOffset, shape.leg.width, shape.leg.height);

    // 靴
    ctx.fillStyle = design.shoe;
    ctx.fillRect(bodyX + 1, bodyY + shape.torso.height + shape.leg.height + stepOffset, shape.foot.width, shape.foot.height);
    ctx.fillRect(bodyX + shape.torso.width - 5, bodyY + shape.torso.height + shape.leg.height - stepOffset, shape.foot.width, shape.foot.height);

    if (facing < 0) {
      ctx.fillStyle = design.shadow;
      ctx.fillRect(headX + 1, headY + 7, 2, 1);
    }
  }

  // 歩行中の上下の揺れ幅を、フレームの偶奇から求める共通処理
  function getBobOffset(style, animFrame) {
    return animFrame === 0 ? -style.bob : style.bob;
  }

  // 敵を描画する関数
  function drawEnemies() {
    const stage = getCurrentStage();
    enemies.forEach((enemy) => {
      const drawX = enemy.x - cameraX;
      const drawY = enemy.y;
      const animationStyle = characterDesign.enemy.animation.walk;
      const bob = Math.abs(enemy.vx) > 0.1 ? getBobOffset(animationStyle, enemy.animFrame) : 0;
      drawCharacterSprite('enemy', drawX, drawY + bob, enemy.vx < 0 ? -1 : 1, animationStyle, enemy.animFrame);
      ctx.fillStyle = stage.colors.enemy;
      ctx.fillRect(drawX + 6, drawY + 6, 8, 8);
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
    const drawX = player.x - cameraX;
    const animationStyle = getPlayerAnimationStyle();
    let bob = 0;
    if (player.onGround) {
      if (Math.abs(player.vx) > 0.2) {
        bob = getBobOffset(animationStyle, player.animFrame);
      }
    } else {
      bob = player.vy < 0 ? -animationStyle.bob : animationStyle.bob;
    }
    const drawY = player.y + bob;
    drawCharacterSprite('player', drawX, drawY, player.facing, animationStyle, player.animFrame);
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
  // timestamp は requestAnimationFrame が渡す現在時刻（ミリ秒）
  let lastTimestamp = null;

  function loop(timestamp) {
    let dt = 1;
    if (lastTimestamp !== null) {
      const elapsedMs = timestamp - lastTimestamp;
      dt = Math.min(elapsedMs / BASE_FRAME_MS, MAX_DELTA);
    }
    lastTimestamp = timestamp;

    if (state === 'playing') {
      handleInput();
      updatePhysics(dt);
      updateAnimation(dt);
      updateEnemies(dt);
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

  // タブを切り替えた時などにキーが押しっぱなし扱いになるのを防ぐ
  window.addEventListener('blur', () => {
    keys = {};
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
  requestAnimationFrame(loop);
})();

