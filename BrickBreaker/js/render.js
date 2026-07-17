// 描画だけを担当するファイル。
// ここに書かれた関数は、渡された値を Canvas に描くだけで、
// ゲームの状態（得点やライフなど）を変更することはない。
// 見た目の変更や新しい描画要素の追加は、このファイルだけを見れば済む。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく IIFE + window.BB という名前空間に公開する方式にしている。
(function () {
/*
  画面の背景を描く関数です。
  上から下にかけて色が少しずつ変わる「グラデーション」を敷いたあと、
  少し目立たない線を等間隔に引いて、奥行きがあるように見せています。
*/
function drawBackground(ctx, CONFIG) {
  // 上の色から下の色へ、少しずつ変化する塗り方（グラデーション）を作る
  const bg = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  bg.addColorStop(0, CONFIG.colors.bgTop);     // 一番上の色
  bg.addColorStop(1, CONFIG.colors.bgBottom);  // 一番下の色
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height); // 画面全体をそのグラデーションで塗る

  const t = Date.now() / 1000;
  const orbs = [
    { x: 48 + Math.sin(t * 0.6) * 8, y: 82 + Math.cos(t * 0.8) * 6, r: 88, color: "rgba(116,247,255,0.18)" },
    { x: CONFIG.width - 56 + Math.cos(t * 0.7) * 10, y: 150 + Math.sin(t * 0.9) * 8, r: 104, color: "rgba(255,209,102,0.12)" },
    { x: CONFIG.width / 2, y: CONFIG.height - 72 + Math.sin(t * 0.5) * 8, r: 120, color: "rgba(157,248,127,0.08)" }
  ];

  for (const orb of orbs) {
    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 画面に少しだけ線を入れて、奥行きを出します。
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; // うすく見える白い線
  ctx.lineWidth = 1;
  for (let y = 0; y <= CONFIG.height; y += 30) { // 30pxごとに横線を1本引く
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CONFIG.width, y);
    ctx.stroke();
  }
  ctx.restore();
}

/*
  まだ壊れていないブロックだけを、四角形として画面に描く関数です。
  alive が false のブロック（すでに壊れたブロック）は描かずに次へ進みます。
*/
function drawBricks(ctx, bricks) {
  for (const brick of bricks) {
    if (!brick.alive) {
      continue; // 壊れたブロックは描かずに次のブロックへ
    }

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = brick.color;
    ctx.fillStyle = brick.color;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height); // ブロックの本体を塗る

    const topHighlight = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
    topHighlight.addColorStop(0, "rgba(255,255,255,0.28)");
    topHighlight.addColorStop(0.3, "rgba(255,255,255,0.08)");
    topHighlight.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = topHighlight;
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height * 0.45);

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.strokeRect(brick.x, brick.y, brick.width, brick.height); // 縁取りの線を描く
    ctx.restore();
  }
}

/*
  パドルを画面に描く関数です。
  shadowBlur を使って、パドルの周りが少し光っているように見せています。
  光らせたあとは shadowBlur を 0 に戻して、他の絵に影響しないようにしています。
*/
function drawPaddle(ctx, paddle, CONFIG) {
  ctx.fillStyle = CONFIG.colors.paddle;
  ctx.shadowBlur = 18;             // ここから光る効果をつける
  ctx.shadowColor = CONFIG.colors.glow;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;              // 光る効果を元に戻す（他の描画に影響しないように）

  const paddleGlow = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  paddleGlow.addColorStop(0, "rgba(255,255,255,0.35)");
  paddleGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = paddleGlow;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height * 0.45);
}

/*
  ボールを画面に描く関数です。
  arc() を使って円を描いています（0 から 2πラジアン = 360度分の円）。
*/
function drawBall(ctx, ball, CONFIG) {
  ctx.beginPath();
  ctx.fillStyle = CONFIG.colors.ball;
  ctx.shadowBlur = 16;
  ctx.shadowColor = CONFIG.colors.ball;
  ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2); // 中心(ball.x, ball.y)、半径ball.sizeの円を描く
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.arc(ball.x - 2, ball.y - 2, Math.max(1.5, ball.size * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

/*
  ゲーム画面全体を描画する。
  まず背景、次にブロック、次にパドル、最後にボールを描く順番を
  ここで一箇所にまとめておくことで、描画順の変更や
  新しい描画要素の追加がしやすくなる。
*/
function drawScene(ctx, CONFIG, { bricks, paddle, ball }) {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);
  drawBackground(ctx, CONFIG);
  drawBricks(ctx, bricks);
  drawPaddle(ctx, paddle, CONFIG);
  drawBall(ctx, ball, CONFIG);
}

  window.BB = window.BB || {};
  window.BB.render = { drawBackground, drawBricks, drawPaddle, drawBall, drawScene };
})();
