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

// パドルの大きさと位置を決める
const paddle = {
  // パドルの横の長さ
  width: 80,
  // パドルの高さ
  height: 12,
  // パドルの左上のx座標
  x: canvas.width / 2 - 40,
  // パドルの左上のy座標
  y: canvas.height - 24,
  // パドルが1回で動く速さ
  speed: 7,
};

// ボールの位置と向きを決める
const ball = {
  // ボールのx座標
  x: canvas.width / 2,
  // ボールのy座標
  y: canvas.height - 40,
  // ボールの半径
  radius: 7,
  // ボールの横方向の速さ
  speedX: 4,
  // ボールの縦方向の速さ
  speedY: -4,
};

// ブロックを入れておく空の配列
const bricks = [];
// ブロックの行数
const brickRows = 4;
// ブロックの列数
const brickCols = 6;
// 1つのブロックの横の長さ
const brickWidth = 60;
// 1つのブロックの高さ
const brickHeight = 20;
// ブロック同士の隙間
const brickPadding = 10;
// ブロックの上の余白
const brickOffsetTop = 40;
// ブロックの左の余白
const brickOffsetLeft = 30;

// ゲームの得点を覚えておく変数
let score = 0;
// ゲームが動いているかどうかを覚えておく変数
let running = false;
// キーボードの入力状態を覚えておくオブジェクト
let keys = {};

// ブロックを最初に配置する関数
function initBricks() {
  // 既存のブロックを消す
  bricks.length = 0;
  // 行ごとにブロックを作る
  for (let row = 0; row < brickRows; row += 1) {
    // 列ごとにブロックを作る
    for (let col = 0; col < brickCols; col += 1) {
      // 1つのブロックを配列に追加する
      bricks.push({
        // ブロックのx座標
        x: col * (brickWidth + brickPadding) + brickOffsetLeft,
        // ブロックのy座標
        y: row * (brickHeight + brickPadding) + brickOffsetTop,
        // ブロックの横の長さ
        width: brickWidth,
        // ブロックの高さ
        height: brickHeight,
        // まだ壊れていないかどうか
        alive: true,
      });
    }
  }
}

// ボールの位置と状態を初期状態に戻す関数
function resetBall() {
  // ボールを真ん中に戻す
  ball.x = canvas.width / 2;
  // ボールを少し上に戻す
  ball.y = canvas.height - 40;
  // ボールの横の速さを元に戻す
  ball.speedX = 4;
  // ボールの縦の速さを元に戻す
  ball.speedY = -4;
  // ゲームを止める
  running = false;
  // 状態表示を初期メッセージに戻す
  statusEl.textContent = 'スペースで開始';
}

// 得点表示を画面に反映する関数
function updateScore() {
  // スコアの数字をHTMLに入れる
  scoreEl.textContent = score;
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

// パドルを描画する関数
function drawPaddle() {
  // パドルを黒で塗る
  ctx.fillStyle = '#111111';
  // パドルの位置と大きさで四角を描く
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

// ボールを描画する関数
function drawBall() {
  // 円の描画を始める
  ctx.beginPath();
  // ボールの円を描く
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  // ボールを黒で塗る
  ctx.fillStyle = '#111111';
  // 円を塗りつぶす
  ctx.fill();
  // 円の描画を終える
  ctx.closePath();
}

// すべてのブロックを描画する関数
function drawBricks() {
  // ブロックを1つずつ確認する
  bricks.forEach((brick) => {
    // 壊れていたら描画しない
    if (!brick.alive) return;
    // ブロックを黒で塗る
    ctx.fillStyle = '#111111';
    // ブロックの四角を描く
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    // ブロックの線を描く
    ctx.strokeStyle = '#111111';
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
  });
}

// キーボード入力に応じてパドルを動かす関数
function updatePaddle() {
  // 左矢印かAが押されていたら左へ動かす
  if (keys.ArrowLeft || keys.KeyA) {
    paddle.x -= paddle.speed;
  }
  // 右矢印かDが押されていたら右へ動かす
  if (keys.ArrowRight || keys.KeyD) {
    paddle.x += paddle.speed;
  }

  // 画面の外に出ないように位置を制限する
  paddle.x = Math.max(0, Math.min(canvas.width - paddle.width, paddle.x));
}

// ボールの位置と向きを更新する関数
function updateBall() {
  // ゲームが止まっていたら何もしない
  if (!running) return;

  // ボールを進める
  ball.x += ball.speedX;
  // ボールを進める
  ball.y += ball.speedY;

  // 左右の壁に当たったら反射させる
  if (ball.x - ball.radius <= 0 || ball.x + ball.radius >= canvas.width) {
    // 横向きを反対にする
    ball.speedX *= -1;
  }

  // 上の壁に当たったら反射させる
  if (ball.y - ball.radius <= 0) {
    // 縦向きを反対にする
    ball.speedY *= -1;
  }

  // パドルに当たったら上向きに反射させる
  if (
    // ボールの左側がパドルの右側より右にある
    ball.x > paddle.x &&
    // ボールの右側がパドルの左側より左にある
    ball.x < paddle.x + paddle.width &&
    // ボールの下側がパドルの上側より下にある
    ball.y + ball.radius >= paddle.y &&
    // ボールの上側がパドルの下側より上にある
    ball.y - ball.radius <= paddle.y + paddle.height
  ) {
    // ボールの縦向きを反対にする
    ball.speedY *= -1;
    // ボールをパドルの上に置く
    ball.y = paddle.y - ball.radius;
  }

  // すべてのブロックと衝突していないか確認する
  bricks.forEach((brick) => {
    // すでに壊れていたら何もしない
    if (!brick.alive) return;
    // ぶつかっているかどうかを調べる
    const hit =
      // ボールの右側がブロックの左側より右にある
      ball.x + ball.radius > brick.x &&
      // ボールの左側がブロックの右側より左にある
      ball.x - ball.radius < brick.x + brick.width &&
      // ボールの下側がブロックの上側より下にある
      ball.y + ball.radius > brick.y &&
      // ボールの上側がブロックの下側より上にある
      ball.y - ball.radius < brick.y + brick.height;

    // ぶつかっていたらブロックを壊す
    if (hit) {
      // ブロックを壊れた状態にする
      brick.alive = false;
      // 得点を増やす
      score += 10;
      // 得点表示を更新する
      updateScore();
      // ボールの縦向きを反対にする
      ball.speedY *= -1;
    }
  });

  // 下に落ちたらゲームをリセットする
  if (ball.y - ball.radius > canvas.height) {
    // ボールを最初に戻す
    resetBall();
    // 状態メッセージを変える
    statusEl.textContent = 'はずしました。もう一度！';
    // ここで処理を終える
    return;
  }

  // すべてのブロックを壊したらクリア表示にする
  if (bricks.every((brick) => !brick.alive)) {
    // ゲームを止める
    running = false;
    // クリアメッセージを表示する
    statusEl.textContent = 'クリア！';
  }
}

// 画面全体を描画する関数
function draw() {
  // 背景を描く
  drawBackground();
  // ブロックを描く
  drawBricks();
  // パドルを描く
  drawPaddle();
  // ボールを描く
  drawBall();
}

// 1フレームごとに動かす処理をまとめた関数
function loop() {
  // パドルの位置を更新する
  updatePaddle();
  // ボールの位置を更新する
  updateBall();
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
    if (!running && !bricks.every((brick) => !brick.alive)) {
      // ゲームを動かす
      running = true;
      // 状態表示を変える
      statusEl.textContent = 'ゲーム中';
    }
  }
});

// キーボードから手を離したときの処理
window.addEventListener('keyup', (event) => {
  // 離したキーの状態をfalseにする
  keys[event.code] = false;
});

// もう一度遊ぶボタンを押したときの処理
restartButton.addEventListener('click', () => {
  // 得点を0に戻す
  score = 0;
  // ブロックを最初から作り直す
  initBricks();
  // ボールを初期位置に戻す
  resetBall();
  // 得点表示を更新する
  updateScore();
});

// 最初に1回だけ実行する初期設定
// ブロックを作る
initBricks();
// 得点表示を更新する
updateScore();
// ボールを初期位置に戻す
resetBall();
// ゲームのループを始める
loop();
