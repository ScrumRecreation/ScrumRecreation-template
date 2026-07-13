// HTML上の要素を取得して、JavaScriptから操作できるようにする
const canvas = document.getElementById('gameCanvas');
// キャンバスの2D描画用の道具を取り出す
const ctx = canvas.getContext('2d');

// 得点を表示する要素を取り出す
const scoreEl = document.getElementById('score');
// 状態メッセージを表示する要素を取り出す
const statusEl = document.getElementById('status');
// リスタートボタンを取り出す
const restartButton = document.getElementById('restartButton');

// プレイヤーの位置と大きさを決める
const player = {
  // プレイヤーの横の長さ
  width: 36,
  // プレイヤーの高さ
  height: 20,
  // プレイヤーのx座標
  x: 60,
  // プレイヤーのy座標
  y: canvas.height / 2 - 10,
  // プレイヤーが1回で動く速さ
  speed: 4,
};

// 弾を入れておく空の配列
const bullets = [];
// 敵を入れておく空の配列
const enemies = [];

// ゲームの得点を覚えておく変数
let score = 0;
// ゲームが動いているかどうかを覚えておく変数
let running = false;
// キーボードの入力状態を覚えておくオブジェクト
let keys = {};
// 敵を出すための時間を数える変数
let enemyTimer = 0;

// 得点表示を画面に反映する関数
function updateScore() {
  // スコアの数字をHTMLに入れる
  scoreEl.textContent = score;
}

// プレイヤーを初期位置に戻す関数
function resetGame() {
  // プレイヤーを左の真ん中に戻す
  player.x = 60;
  player.y = canvas.height / 2 - 10;
  // 弾を空にする
  bullets.length = 0;
  // 敵を空にする
  enemies.length = 0;
  // 得点を0に戻す
  score = 0;
  // ゲームを止める
  running = false;
  // 状態表示を初期メッセージに戻す
  statusEl.textContent = 'スペースで開始';
  // 得点表示を更新する
  updateScore();
}

// 敵を1体出す関数
function spawnEnemy() {
  // 画面の右外に敵を作る
  enemies.push({
    // 敵のx座標
    x: canvas.width + 30,
    // 敵のy座標
    y: Math.random() * (canvas.height - 40) + 20,
    // 敵の横の長さ
    width: 28,
    // 敵の高さ
    height: 18,
    // 敵の進む速さ
    speed: 2 + Math.random() * 1.5,
  });
}

// プレイヤーを動かす関数
function updatePlayer() {
  // 上へ動く
  if (keys.ArrowUp || keys.KeyW) {
    player.y -= player.speed;
  }
  // 下へ動く
  if (keys.ArrowDown || keys.KeyS) {
    player.y += player.speed;
  }
  // 左へ動く
  if (keys.ArrowLeft || keys.KeyA) {
    player.x -= player.speed;
  }
  // 右へ動く
  if (keys.ArrowRight || keys.KeyD) {
    player.x += player.speed;
  }

  // 画面の外に出ないように位置を制限する
  player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

// 弾を発射する関数
function shoot() {
  // ゲームが動いていなかったら何もしない
  if (!running) return;
  // 弾を1つ作って配列に入れる
  bullets.push({
    // 弾のx座標
    x: player.x + player.width,
    // 弾のy座標
    y: player.y + player.height / 2 - 2,
    // 弾の横の長さ
    width: 10,
    // 弾の高さ
    height: 4,
    // 弾の速さ
    speed: 8,
  });
}

// 弾を動かす関数
function updateBullets() {
  // 弾を1つずつ動かす
  bullets.forEach((bullet, index) => {
    // 右へ進める
    bullet.x += bullet.speed;
    // 画面の外に出たら消す
    if (bullet.x > canvas.width) {
      bullets.splice(index, 1);
    }
  });
}

// 敵を動かす関数
function updateEnemies() {
  // 敵を出す時間を増やす
  enemyTimer += 1;
  // ある間隔で敵を出す
  if (enemyTimer > 90) {
    spawnEnemy();
    enemyTimer = 0;
  }

  // 敵を1体ずつ動かす
  enemies.forEach((enemy, index) => {
    // 左へ進める
    enemy.x -= enemy.speed;
    // 画面の左外に出たら消す
    if (enemy.x + enemy.width < 0) {
      enemies.splice(index, 1);
    }
  });
}

// 当たり判定を調べる関数
function checkCollisions() {
  // 弾を1つずつ確認する
  bullets.forEach((bullet, bulletIndex) => {
    // 敵を1つずつ確認する
    enemies.forEach((enemy, enemyIndex) => {
      // 弾と敵が重なっていたら
      const hit =
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y;

      // ぶつかっていたら両方を消す
      if (hit) {
        bullets.splice(bulletIndex, 1);
        enemies.splice(enemyIndex, 1);
        score += 10;
        updateScore();
      }
    });
  });
}

// 背景を描画する関数
function drawBackground() {
  // 背景を白で塗りつぶす
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // 周りに枠線を描く
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
}

// プレイヤーを描画する関数
function drawPlayer() {
  // プレイヤーを黒で塗る
  ctx.fillStyle = '#111111';
  // プレイヤーの形を四角で描く
  ctx.fillRect(player.x, player.y, player.width, player.height);
}

// 弾を描画する関数
function drawBullets() {
  // 弾を1つずつ描く
  bullets.forEach((bullet) => {
    ctx.fillStyle = '#111111';
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  });
}

// 敵を描画する関数
function drawEnemies() {
  // 敵を1つずつ描く
  enemies.forEach((enemy) => {
    ctx.fillStyle = '#111111';
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

// 画面全体を描画する関数
function draw() {
  // 背景を描く
  drawBackground();
  // 敵を描く
  drawEnemies();
  // 弾を描く
  drawBullets();
  // プレイヤーを描く
  drawPlayer();
}

// 1フレームごとに動かす処理をまとめた関数
function loop() {
  // プレイヤーの位置を更新する
  updatePlayer();
  // ゲームが動いていたら敵と弾を更新する
  if (running) {
    updateBullets();
    updateEnemies();
    checkCollisions();
  }
  // 画面を描画する
  draw();
  // 次のフレームを予約する
  requestAnimationFrame(loop);
}

// キーボード入力を受け取る処理
window.addEventListener('keydown', (event) => {
  // 入力されたキーの状態を記録する
  keys[event.code] = true;
  // スペースキーが押されたら
  if (event.code === 'Space') {
    // ページのスクロールを止める
    event.preventDefault();
    // ゲームがまだ始まっていないときだけ始める
    if (!running) {
      running = true;
      statusEl.textContent = 'ゲーム中';
    }
    // 発射する
    shoot();
  }
});

// キーボードから手を離したときの処理
window.addEventListener('keyup', (event) => {
  // 離したキーの状態をfalseにする
  keys[event.code] = false;
});

// もう一度遊ぶボタンを押したときの処理
restartButton.addEventListener('click', () => {
  // ゲームを最初の状態に戻す
  resetGame();
});

// 最初に1回だけ実行する初期設定
resetGame();
loop();
