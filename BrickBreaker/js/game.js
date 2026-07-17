// この JavaScript は、ブロック崩しの「まとめ役」です。
// 実際の計算（当たり判定・生成・描画・入力）はそれぞれ別ファイルに任せ、
// ここではゲームの状態を持ち、それらを組み合わせて1フレームずつ進めます。
// 役割ごとにファイルが分かれているので、
// 何かを追加・変更したいときに触るべき場所がすぐに分かるようにしている。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく、他ファイルが window.BB に公開した内容を読み取る形にしている。
// index.html で config.js -> collision.js -> entities.js -> render.js
// -> input.js -> events.js -> game.js の順に読み込むため、ここでは既に揃っている。
(function () {
  const { CONFIG } = window.BB;
  const { circleIntersectsRect, shallowerOverlapAxis, clamp } = window.BB.collision;
  const { createPaddle, createBall, createBricks } = window.BB.entities;
  const { drawScene } = window.BB.render;
  const { createInputController } = window.BB.input;
  const { createEmitter } = window.BB.events;

  /*
    効果音を出すためのとても小さな音の仕組みです。
    ブラウザの Web Audio API を使って、短い音をその場で作ります。
    音声ファイルを用意しなくても動くので、ゲームのたたき台に向いています。
  */
  function createSoundEngine(soundConfig) {
    const enabled = soundConfig?.enabled !== false;
    let audioContext = null;
    let masterGain = null;
    let compressor = null;

    if (enabled && typeof window.AudioContext !== "undefined") {
      audioContext = new window.AudioContext({ latencyHint: "interactive" });
      masterGain = audioContext.createGain();
      compressor = audioContext.createDynamicsCompressor();
      masterGain.gain.value = 1;
      compressor.threshold.value = -24;
      compressor.knee.value = 18;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.12;
      masterGain.connect(compressor);
      compressor.connect(audioContext.destination);
    }

    function getContext() {
      if (!enabled || typeof window.AudioContext === "undefined") {
        return null;
      }

      if (!audioContext) {
        audioContext = new window.AudioContext({ latencyHint: "interactive" });
        masterGain = audioContext.createGain();
        compressor = audioContext.createDynamicsCompressor();
        masterGain.gain.value = 1;
        compressor.threshold.value = -24;
        compressor.knee.value = 18;
        compressor.ratio.value = 8;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.12;
        masterGain.connect(compressor);
        compressor.connect(audioContext.destination);
      }

      return audioContext;
    }

    function unlock() {
      const context = getContext();
      if (!context) {
        return;
      }

      if (context.state === "suspended") {
        context.resume().then(() => {
          // ここで音の通り道を一度だけ鳴らして、初回の引っかかりを減らす。
          const warmup = context.createOscillator();
          const warmupGain = context.createGain();
          warmup.frequency.value = 40;
          warmup.type = "sine";
          warmupGain.gain.value = 0.00001;
          warmup.connect(warmupGain);
          warmupGain.connect(masterGain);
          warmup.start();
          warmup.stop(context.currentTime + 0.03);
        }).catch(() => {});
      }
    }

    function playTone(name, delay = 0) {
      const context = getContext();
      if (!context) {
        return;
      }

      const tone = soundConfig.tones[name];
      if (!tone) {
        return;
      }

      const startTime = context.currentTime + delay;
      const duration = tone.duration ?? 0.08;
      const endTime = startTime + duration;
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.setValueAtTime(tone.frequency ?? 440, startTime);
      if (tone.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, endTime);
      }

      const volume = (soundConfig.masterVolume ?? 0.15) * (tone.volume ?? 0.5);
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startTime + 0.002);
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      oscillator.connect(gain);
      gain.connect(masterGain ?? context.destination);
      oscillator.start(startTime);
      oscillator.stop(endTime + 0.03);
    }

    function play(name) {
      playTone(name);
    }

    function playTwoTone(nameA, nameB) {
      playTone(nameA);
      playTone(nameB, 0.09);
    }

    return { unlock, play, playTwoTone };
  }

  /*
    ブロック探索を軽くするための「空間インデックス」を作る関数です。
    すべてのブロックを毎回なめる代わりに、
    画面を小さなセル（升目）に区切って、
    「どのセルにどのブロックがいるか」を前計算しておきます。

    こうしておくと、当たり判定のときは
    ボール周辺セルにいる候補だけを見ればよくなり、
    ブロック数が多いときほど効果が出ます。

    返り値:
    - cellSize: 1セルの大きさ
    - buckets: "cx:cy" をキーに、ブロック配列の添字一覧を持つ Map
  */
  function buildBrickSpatialIndex(bricks) {
    if (!bricks.length) {
      return null;
    }

    const sample = bricks[0];
    const cellSize = Math.max(8, Math.floor(Math.max(sample.width, sample.height) * 2));
    const buckets = new Map();

    for (let i = 0; i < bricks.length; i += 1) {
      const brick = bricks[i];
      const startX = Math.floor(brick.x / cellSize);
      const endX = Math.floor((brick.x + brick.width) / cellSize);
      const startY = Math.floor(brick.y / cellSize);
      const endY = Math.floor((brick.y + brick.height) / cellSize);

      for (let cy = startY; cy <= endY; cy += 1) {
        for (let cx = startX; cx <= endX; cx += 1) {
          const key = `${cx}:${cy}`;
          if (!buckets.has(key)) {
            buckets.set(key, []);
          }
          buckets.get(key).push(i);
        }
      }
    }

    return { cellSize, buckets };
  }

  /*
    いまのボール位置に近いセルだけを参照して、
    当たり判定候補のブロック配列を返す関数です。

    ボールの外接四角形（中心 ± 半径）からセル範囲を求め、
    そのセルに登録されているブロックだけを候補にします。
    複数セルにまたがって同じブロックが見つかることがあるので、
    Set で重複を取り除いてから返します。

    index がない場合（ブロック0個など）は、
    安全側に倒して元のブロック配列をそのまま返します。
  */
  function getNearbyBricks(index, bricks, ball) {
    if (!index) {
      return bricks;
    }

    const { cellSize, buckets } = index;
    const startX = Math.floor((ball.x - ball.size) / cellSize);
    const endX = Math.floor((ball.x + ball.size) / cellSize);
    const startY = Math.floor((ball.y - ball.size) / cellSize);
    const endY = Math.floor((ball.y + ball.size) / cellSize);

    const seen = new Set();
    const candidates = [];
    for (let cy = startY; cy <= endY; cy += 1) {
      for (let cx = startX; cx <= endX; cx += 1) {
        const key = `${cx}:${cy}`;
        const bucket = buckets.get(key);
        if (!bucket) {
          continue;
        }

        for (const idx of bucket) {
          if (seen.has(idx)) {
            continue;
          }
          seen.add(idx);
          candidates.push(bricks[idx]);
        }
      }
    }

    return candidates;
  }

// ゲーム本体で使う要素をまとめて取得する。
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const stageBadgeEl = document.getElementById("stageBadge");
const stageNameEl = document.getElementById("stageName");
const stageProgressEl = document.getElementById("stageProgress");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const restartBtn = document.getElementById("restartBtn");

/*
  スマートフォンやビクカーラ画面でも文字や図形がにじまないように、
  画面の解像度（devicePixelRatio）に合わせて
  Canvas の実際の描画解像度だけを上げている。
  CSS の表示サイズ（width:100%）は変えないので、
  レイアウトのレスポンス対応には影響しない。
*/
const pixelRatio = window.devicePixelRatio || 1;
canvas.width = CONFIG.width * pixelRatio;
canvas.height = CONFIG.height * pixelRatio;
ctx.scale(pixelRatio, pixelRatio);

/*
  ゲームの状態（phase・得点・残機・パドル・ボール・ブロック）を
  ひとつの game オブジェクトにまとめている。
  ready  = まだ始まっていない状態
  playing = ゲーム中
  over = ゲームオーバー
  win = クリア

  最適化用の状態として、次の2つも持たせる。
  - brickSpatialIndex: 近傍探索を高速化するための空間インデックス
  - aliveBricks: まだ壊れていないブロック数（毎フレーム全走査を避けるため）
*/
const game = {
  phase: "ready",
  stageIndex: 0,
  score: 0,
  lives: CONFIG.initialLives,
  paddle: createPaddle(CONFIG),
  ball: null,
  bricks: [],
  brickSpatialIndex: null,
  aliveBricks: 0
};
game.bricks = createBricks(CONFIG, CONFIG.stages[game.stageIndex]);
game.brickSpatialIndex = buildBrickSpatialIndex(game.bricks);
game.aliveBricks = game.bricks.length;
game.ball = createBall(CONFIG, game.paddle);
const sound = createSoundEngine(CONFIG.sound);

/*
  「何が起きたか」を発行するだけの小さなイベントの仕組みです。
  HUD の更新や画面表示の切り替えは、ここで登録した処理が反応します。
  当たり判定側は「起きたことを知らせる」だけでよく、
  将来サウンドやエフェクトを足すときも、購読を追加するだけで済む。
*/
const events = createEmitter();
events.on("scoreChanged", updateHud);                                   // 得点が変わったらHUDを更新する
events.on("livesChanged", updateHud);                                   // 残機が変わったらHUDを更新する
events.on("lifeLost", (message) => showOverlay(message));              // ライフを失ったら、渡されたメッセージを表示する
events.on("gameOver", () => showOverlay("ゲームオーバー\nもう一度遊ぼう")); // 全滅したらゲームオーバーの案内を出す
events.on("gameWin", () => showOverlay("ステージクリア！\n次のステージへ進もう"));      // ステージを全部壊したらクリアの案内を出す

/*
  ゲームを最初の状態に戻す関数です。
  これを呼ぶと、得点・残機・ブロック・パドル・ボールを初期状態に戻します。
  その後、タイトル画面を表示して待機状態にします。
*/
function initGame() {
  game.stageIndex = 0;
  game.score = 0;
  game.lives = CONFIG.initialLives;
  applyStageSettings(CONFIG.stages[game.stageIndex]);
  game.bricks = createBricks(CONFIG, CONFIG.stages[game.stageIndex]);
  game.brickSpatialIndex = buildBrickSpatialIndex(game.bricks);
  game.aliveBricks = game.bricks.length;
  game.paddle = createPaddle(CONFIG);
  game.ball = createBall(CONFIG, game.paddle);
  game.phase = "ready";

  updateStageHud();
  updateHud();
  showOverlay("タップしてスタート\n3ステージ全部に挑戦しよう");
  draw();
}

/*
  ステージに書かれた難易度を、実際のゲーム設定へ反映する関数です。
  たとえばパドルの幅やボールの速さを、ステージごとに変えられるようになります。
  ここでは CONFIG の値を書き換えるのではなく、ゲーム用の現在値を上書きしています。
*/
function applyStageSettings(stage) {
  CONFIG.paddleWidth = stage.difficulty.paddleWidth;
  game.paddle.width = stage.difficulty.paddleWidth;
  game.paddle.height = CONFIG.paddleHeight;
  CONFIG.paddleSpeed = stage.difficulty.paddleSpeed;
  CONFIG.ballSpeed = stage.difficulty.ballSpeed;
  CONFIG.ballBoostOnHit = stage.difficulty.ballBoostOnHit;
  CONFIG.ballMinHorizontalSpeed = stage.difficulty.ballMinHorizontalSpeed;
}

/*
  いま何面目かを画面に見せる関数です。
  数字だけでなくステージ名も出すことで、「次はどんな面かな」と思いやすくします。
*/
function updateStageHud() {
  const currentStage = CONFIG.stages[game.stageIndex];
  const stageNumber = game.stageIndex + 1;
  const totalStages = CONFIG.stages.length;
  stageBadgeEl.textContent = `${stageNumber} / ${totalStages}`;
  stageNameEl.textContent = currentStage.name;
  stageProgressEl.style.width = `${(stageNumber / totalStages) * 100}%`;
}

/*
  スコアと残機を HTML 上の要素に反映する関数です。
  textContent に文字列として入れることで、画面に表示されます。
*/
function updateHud() {
  scoreEl.textContent = String(game.score);
  livesEl.textContent = String(game.lives);
}

/*
  オーバーレイにメッセージを出す関数です。
  画面中央の案内を表示したいときに使います。
*/
function showOverlay(message) {
  overlayText.textContent = message;
  overlay.classList.remove("hidden");
}

/*
  オーバーレイを隠す関数です。
  ゲーム開始時に呼んで、画面を見やすくします。
*/
function hideOverlay() {
  overlay.classList.add("hidden");
}

/*
  ゲームを開始する関数です。
  すでにプレイ中なら何もしません。
  もしゲームオーバーまたはクリア済みなら、初期化してから開始します。
*/
function startGame() {
  sound.unlock();

  if (game.phase === "playing") {
    return;
  }

  if (game.phase === "over" || game.phase === "win") {
    initGame();
  }

  hideOverlay();
  game.phase = "playing";
  sound.play("start");
}

/*
  次のステージへ進む関数です。
  現在のステージ番号を1つ増やし、そのステージの設定を反映してから
  ブロックとボールを作り直します。
  3つ目のステージまで終わっていたら、全ステージクリアとして扱います。
*/
function advanceStage() {
  if (game.stageIndex + 1 >= CONFIG.stages.length) {
    game.phase = "win";
    showOverlay("全ステージクリア！\nきみはラストまでたどり着いた！");
    sound.playTwoTone("stageClear", "win");
    return false;
  }

  game.stageIndex += 1;
  applyStageSettings(CONFIG.stages[game.stageIndex]);
  game.bricks = createBricks(CONFIG, CONFIG.stages[game.stageIndex]);
  game.brickSpatialIndex = buildBrickSpatialIndex(game.bricks);
  game.aliveBricks = game.bricks.length;
  game.paddle = createPaddle(CONFIG);
  game.ball = createBall(CONFIG, game.paddle);
  game.phase = "ready";
  updateStageHud();
  showOverlay(`${CONFIG.stages[game.stageIndex].name}\nタップして続ける`);
  sound.play("stageClear");
  return true;
}

/*
  キーボード・タッチ操作の状態を管理する入力コントローラーです。
  スペースキーやタップでゲームを開始できるように、
  startGame をそのまま渡しています。
*/
const input = createInputController(canvas, CONFIG, startGame);

/*
  パドルを動かす関数です。
  キーボード入力があれば左または右へ移動し、
  タッチ操作ならタップ位置に合わせて移動します。
  最後に画面の外へ出ないよう、位置を左右の壁の内側に収めています。
*/
function updatePaddle() {
  const paddle = game.paddle;

  if (input.keys.left) {
    paddle.x -= CONFIG.paddleSpeed; // 左矢印キーが押されていたら、左へ少し動かす
  }
  if (input.keys.right) {
    paddle.x += CONFIG.paddleSpeed; // 右矢印キーが押されていたら、右へ少し動かす
  }
  if (input.isPointerActive()) {
    paddle.x = input.getPointerX() - paddle.width / 2; // タップ中は、指の位置がパドルの中心に来るようにする
  }

  paddle.x = clamp(paddle.x, 0, CONFIG.width - paddle.width); // パドルが画面の左右からはみ出さないようにする
}

/*
  ボールの位置を更新し、壁・パドル・ブロックとの当たり判定を行う関数です。
  ここがゲームの中心ロジックです。
  ルールはシンプルで、ボールが壁に当たると反射し、
  パドルやブロックに当たると向きを変えます。
  当たり判定そのものの計算は collision.js に任せているので、
  ここでは「当たったらどう反応するか」だけを書いている。
*/
function updateBall() {
  const { ball, paddle, bricks } = game;

  ball.x += ball.vx;
  ball.y += ball.vy;

  // 左右の壁に当たったら、横方向の速度を反転します。
  if (ball.x - ball.size <= 0) {
    ball.x = ball.size;
    ball.vx *= -1;
    sound.play("wallBounce");
  } else if (ball.x + ball.size >= CONFIG.width) {
    ball.x = CONFIG.width - ball.size;
    ball.vx *= -1;
    sound.play("wallBounce");
  }

  // 上の壁に当たったら、縦方向の速度を反転します。
  if (ball.y - ball.size <= 0) {
    ball.y = ball.size;
    ball.vy *= -1;
    sound.play("wallBounce");
  }

  // パドルに当たったかどうかを確認します。
  // ボールが下向き（vy > 0）に進んでいるときだけ、パドルとの当たり判定を行います。
  // 上に向かっている途中でパドルに触れても、ここでは無視します。
  const hitPaddle = ball.vy > 0 && circleIntersectsRect(ball, paddle);

  if (hitPaddle) {
    ball.y = paddle.y - ball.size; // ボールがパドルにめり込まないよう、パドルのすぐ上に位置を戻す
    // パドルのどこに当たったかで反射角度を変えます。
    // offset は「パドルの中心からどれだけ離れた位置に当たったか」を -1〜1 の割合で表す。
    // 端っこに当たるほど offset の絶対値が大きくなり、ボールが強く斜めに跳ねる。
    const offset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    ball.vx = offset * (CONFIG.ballSpeed + CONFIG.ballBoostOnHit);
    ball.vy = -Math.abs(ball.vy); // 必ず上向きに跳ね返すようにする（下向きにならないように）

    // 真ん中に当たって vx が 0 に近いと、ボールが真上/真下だけを
    // 永遠に往復してゲームが進まなくなることがあるので、
    // 横方向の最小速度を保障してあげる。
    if (Math.abs(ball.vx) < CONFIG.ballMinHorizontalSpeed) {
      ball.vx = ball.vx < 0 ? -CONFIG.ballMinHorizontalSpeed : CONFIG.ballMinHorizontalSpeed;
    }

    sound.play("paddleBounce");
  }

  // すべてのブロックを順に見て、当たっていたら壊します。
  const nearbyBricks = getNearbyBricks(game.brickSpatialIndex, bricks, ball);
  for (const brick of nearbyBricks) {
    if (!brick.alive) {
      continue; // すでに壊れているブロックは調べずに次へ進む
    }

    if (!circleIntersectsRect(ball, brick)) {
      continue; // ボールと重なっていなければ、当たっていないので次のブロックへ
    }

    brick.alive = false; // ブロックを壊れた状態にする（次のdrawBricksでは描かれなくなる）
    game.aliveBricks -= 1;
    game.score += brick.score;
    events.emit("scoreChanged"); // 得点が変わったことを知らせる（HUDの表示が更新される）
    sound.play("brickHit");

    // ボールがブロックの上下から来たのか、左右から来たのかを
    // めり込み量（重なっている量）の小さい方で判定し、
    // その方向だけを反転させる。これで斜めの当たり方でも自然に跳ねる。
    if (shallowerOverlapAxis(ball, brick) === "x") {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }
    break;
  }

  // ボールが下に落ちたらライフを減らし、必要ならゲームオーバーにします。
  if (ball.y - ball.size > CONFIG.height) {
    game.lives -= 1; // 残機を1つ減らす
    events.emit("livesChanged"); // 残機が変わったことを知らせる（HUDの表示が更新される）

    if (game.lives <= 0) {
      game.phase = "over"; // 残機が0以下ならゲームオーバーの状態にする
      events.emit("gameOver");
      sound.play("gameOver");
      return; // ここで処理を終える（ボールを作り直す必要がないため）
    }

    game.ball = createBall(CONFIG, paddle); // 残機が残っていれば、ボールをパドルの上に作り直す
    game.phase = "ready";                   // タップ/スペースキーで再開できる状態に戻す
    events.emit("lifeLost", "ライフを失った！\nタップして続ける");
    sound.play("lifeLost");
  }

  // すべてのブロックがなくなったらクリアです。
  if (game.aliveBricks <= 0) {
    const advanced = advanceStage();
    if (!advanced && game.phase === "win") {
      events.emit("gameWin");
    }
  }
}

/*
  キャンバスに描画する関数です。
  実際の描画処理は render.js の drawScene に任せ、
  ここでは今の状態をそのまま渡すだけにしています。
*/
function draw() {
  drawScene(ctx, CONFIG, game);
}

/*
  1 フレームごとに状態を更新して描画を続ける関数です。
  requestAnimationFrame を使うことで、滑らかなアニメーションになります。
  パドルは「ready（発射前）」でも動かせるようにして、
  タップする前から位置を整えられるようにしています。
  このときボールはパドルの上に乗ったままついてくるようにして、
  見た目の違和感がないようにしています。
*/
function loop() {
  if (game.phase === "ready" || game.phase === "playing") {
    updatePaddle(); // 「準備中」でも「プレイ中」でも、パドルはいつでも動かせるようにする
  }

  if (game.phase === "playing") {
    updateBall(); // プレイ中だけ、ボールを動かして当たり判定を行う
  } else if (game.phase === "ready") {
    // まだ始まっていないときは、ボールがパドルの上に乗って一緒に動くように見せる
    game.ball.x = game.paddle.x + game.paddle.width / 2;
    game.ball.y = game.paddle.y - game.ball.size - 4;
  }

  draw();
  requestAnimationFrame(loop); // 次の1コマ分の描画タイミングで、再びこの関数を呼んでもらう
}

/*
  オーバーレイをタップしたときにゲームを開始します。
  これで、初めての一歩がとても分かりやすくなります。
*/
overlay.addEventListener("pointerdown", () => {
  startGame();
});

/*
  再スタートボタンを押したときに、ゲームを初期化します。
*/
restartBtn.addEventListener("click", () => {
  initGame();
});

/*
  最後にゲームを初期状態で開始し、アニメーションループを動かします。
  これで画面がすぐに見えるようになります。
*/
initGame();
requestAnimationFrame(loop);
})();
