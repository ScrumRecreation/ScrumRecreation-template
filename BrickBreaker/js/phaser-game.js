(function () {
  // 共有名前空間から設定を読み取る。
  // 必須要素が欠けている場合は何もせず終了する。
  const BB = window.BB || {};
  const CONFIG = BB.CONFIG;
  const SHARED_CONSTANTS = BB.constants;

  if (!window.Phaser || !CONFIG || !SHARED_CONSTANTS) {
    return;
  }

  /*
    共通定数を取り出す。
    定義元は constants.js で、
    このファイルは「使う側」に徹することで責務を分離する。
  */
  const { PHASE, UI_TEXT, TUNING } = SHARED_CONSTANTS;

  /*
    必須 DOM 要素を取得する小さなヘルパーです。
    もし要素が見つからなければ、原因が分かるエラーメッセージを投げます。
  */
  function getRequiredElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error("Required element not found: #" + id);
    }
    return element;
  }

  // 既存 HTML の HUD / Overlay 要素をそのまま使う。
  // 表示更新は Scene 内からここへ直接反映する。
  const scoreEl = getRequiredElement("score");
  const livesEl = getRequiredElement("lives");
  const stageBadgeEl = getRequiredElement("stageBadge");
  const stageNameEl = getRequiredElement("stageName");
  const stageProgressEl = getRequiredElement("stageProgress");
  const overlayEl = getRequiredElement("overlay");
  const overlayTextEl = getRequiredElement("overlayText");
  const restartBtn = getRequiredElement("restartBtn");

  /*
    オーバーレイ（中央メッセージ）を表示する関数です。
    渡された message を本文に入れ、hidden クラスを外して見える状態にします。
    画面の状態説明はこの関数に集約しておくと、文言変更がしやすくなります。
  */
  function showOverlay(message) {
    overlayTextEl.textContent = message;
    overlayEl.classList.remove("hidden");
  }

  /*
    オーバーレイを非表示にする関数です。
    ゲーム開始時など、メッセージが不要な場面で呼びます。
  */
  function hideOverlay() {
    overlayEl.classList.add("hidden");
  }

  /*
    効果音（SE）の設定テーブルです。
    旧実装で使っていた音色・長さ・音量に近い値をここへ集約し、
    ゲーム本体ロジックからは「名前（start / brickHit など）」で呼べる形にします。

    ポイント:
    - enabled: SE全体のON/OFF
    - masterVolume: 全SEに共通でかかる最終音量
    - tones: 各SEの音色設定（波形/周波数/時間/音量）
  */
  const SOUND_CONFIG = {
    enabled: true,
    masterVolume: 0.22,
    tones: {
      start: { type: "sine", frequency: 660, endFrequency: 990, duration: 0.08, volume: 0.9 },
      paddleBounce: { type: "triangle", frequency: 300, endFrequency: 380, duration: 0.035, volume: 0.5 },
      brickHit: { type: "square", frequency: 600, endFrequency: 280, duration: 0.045, volume: 0.55 },
      lifeLost: { type: "sawtooth", frequency: 180, endFrequency: 95, duration: 0.14, volume: 0.55 },
      gameOver: { type: "sawtooth", frequency: 150, endFrequency: 75, duration: 0.2, volume: 0.7 },
      stageClear: { type: "sine", frequency: 523.25, endFrequency: 880, duration: 0.12, volume: 0.7 },
      win: { type: "sine", frequency: 523.25, endFrequency: 1174.66, duration: 0.22, volume: 0.85 }
    }
  };

  /*
    WebAudioを使ってSEを鳴らす小さなプレイヤーを作る関数です。
    ブラウザの自動再生制限（ユーザー操作が必要）に対応するため、
    unlock と play を分けて返します。

    返り値:
    - unlock(): AudioContextの再開を試みる
    - play(name): SOUND_CONFIG.tones[name] の音を鳴らす
  */
  function createSoundPlayer() {
    let audioContext = null;
    let masterGain = null;

    /*
      AudioContextを遅延初期化で取得する関数です。
      必要になるまで実体を作らないことで、
      ページ読み込み直後の不要な初期化を避けます。
    */
    function getAudioContext() {
      if (!SOUND_CONFIG.enabled) {
        return null;
      }
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        return null;
      }
      if (!audioContext) {
        audioContext = new AudioContextClass();
        masterGain = audioContext.createGain();
        masterGain.gain.value = SOUND_CONFIG.masterVolume;
        masterGain.connect(audioContext.destination);
      }
      return audioContext;
    }

    /*
      ユーザー操作後にAudioContextを再開する関数です。
      ブラウザが音声開始を許可していない状態（suspended）でだけ resume します。
    */
    function unlock() {
      const context = getAudioContext();
      if (context && context.state === "suspended") {
        context.resume().catch(function () {
          // ブラウザ側で拒否された場合は、次のユーザー操作で再試行する。
        });
      }
    }

    /*
      1つのトーン設定を実際に鳴らす低レベル関数です。
      - OscillatorNode: 音程と波形を作る
      - GainNode: 音量エンベロープ（立ち上がり→減衰）を作る

      ここは「音の生成」だけを担当し、
      どのSEを鳴らすかの判定は play 側で行います。
    */
    function playTone(context, tone) {
      if (!masterGain) {
        return;
      }

      const osc = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const attack = 0.005;
      const duration = tone.duration;
      const endTime = now + duration;

      osc.type = tone.type;
      osc.frequency.setValueAtTime(tone.frequency, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.endFrequency), endTime);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(tone.volume, Math.min(endTime, now + attack));
      gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(now);
      osc.stop(endTime + 0.01);
    }

    /*
      名前付きSEを再生する高レベル関数です。
      流れ:
      1) 設定テーブルから tone を引く
      2) AudioContext を取得する
      3) suspended なら resume 後に再生
      4) running なら即再生
    */
    function play(name) {
      const tone = SOUND_CONFIG.tones[name];
      if (!tone) {
        return;
      }

      const context = getAudioContext();
      if (!context || !masterGain) {
        return;
      }

      if (context.state === "suspended") {
        context.resume().then(function () {
          playTone(context, tone);
        }).catch(function () {
          // resume できない場合は無音で継続する。
        });
        return;
      }

      playTone(context, tone);
    }

    return { unlock, play };
  }

  const sfx = createSoundPlayer();

  // ページ上の最初の操作で音声再生が許可されるよう、
  // 全体入力で unlock を呼んでおく。
  document.addEventListener("pointerdown", sfx.unlock, { passive: true });
  document.addEventListener("keydown", sfx.unlock, { passive: true });

  /*
    色指定を Phaser が扱える形式にそろえる関数です。
    - すでに数値ならそのまま使う
    - "0x..." 文字列なら数値へ変換する
    - それ以外は白色（0xffffff）にフォールバックする
    設定の書き方が混ざっても安全に動かすためのガードです。
  */
  function normalizeColor(color) {
    if (typeof color === "number") {
      return color;
    }
    if (typeof color === "string" && color.startsWith("0x")) {
      return Number(color);
    }
    return 0xffffff;
  }

  /*
    ステージの2次元配列（blockLayout）から、
    実際に配置するブロック一覧を作る関数です。

    役割:
    1) 行数・列数を読み取る
    2) brickField の範囲に収まるよう、ブロック幅/高さ/隙間を自動計算する
    3) 空きマスを除いて、配置情報（x, y, width, height, color, score, hp）を返す

    返り値は「まだ描画していない設計図データ」で、
    実際の生成は buildStage 側で行います。
  */
  function createBrickMap(stage) {
    // レイアウトは「行の配列」の形になっている。
    const layout = stage.blockLayout || [];
    // 行数（上から何段あるか）。
    const rows = layout.length;
    if (!rows) {
      return [];
    }

    const cols = layout.reduce(function (max, row) {
      return Math.max(max, row.length);
    }, 0);

    if (!cols) {
      return [];
    }

    // ここから、ブロックをどの範囲に並べるかを計算する。
    const field = CONFIG.brickField;
    const left = field.left;
    const right = field.right;
    const top = field.top;
    const fallbackBottom = CONFIG.paddleY - TUNING.bottomPaddingFromPaddle;
    const bottom = Math.min(field.bottom, fallbackBottom);
    const availableWidth = Math.max(TUNING.minPlayfieldSize, CONFIG.width - left - right);
    const availableHeight = Math.max(TUNING.minPlayfieldSize, bottom - top);

    // 隙間を広げすぎると領域からはみ出すので、最大値を先に計算する。
    const maxGapByWidth = cols > 1 ? (availableWidth - cols) / (cols - 1) : availableWidth;
    const maxGapByHeight = rows > 1 ? (availableHeight - rows) / (rows - 1) : availableHeight;
    const gapLimit = Math.max(0, Math.min(maxGapByWidth, maxGapByHeight));
    const gap = Math.min(field.minGap || 0, gapLimit);

    // 行列数と隙間から、1個あたりのブロックサイズを逆算する。
    const brickWidth = (availableWidth - Math.max(0, cols - 1) * gap) / cols;
    const brickHeight = (availableHeight - Math.max(0, rows - 1) * gap) / rows;

    const bricks = [];
    // 2重ループで「上から下、左から右」にブロックを作る。
    for (let row = 0; row < layout.length; row += 1) {
      const line = layout[row];
      for (let col = 0; col < line.length; col += 1) {
        const typeKey = line[col];
        if (!typeKey) {
          // 空欄セルはブロックを置かない。
          continue;
        }
        const type = CONFIG.blockTypes[typeKey];
        if (!type) {
          // 未定義の種類は安全のため無視する。
          continue;
        }

        // rectangle は中心座標で置くので、幅高さの半分を足して位置を作る。
        const x = left + col * (brickWidth + gap) + brickWidth / 2;
        const y = top + row * (brickHeight + gap) + brickHeight / 2;
        bricks.push({
          x: x,
          y: y,
          width: brickWidth,
          height: brickHeight,
          color: normalizeColor(type.color),
          score: type.score || TUNING.defaultBrickScore,
          hp: type.hitPoints || TUNING.defaultBrickHp
        });
      }
    }

    return bricks;
  }

  class BrickBreakerScene extends Phaser.Scene {
    constructor() {
      super("BrickBreakerScene");

      // 進行状態
      this.phase = PHASE.READY;
      this.stageIndex = 0;
      this.score = 0;
      this.lives = CONFIG.initialLives;
      this.remainingBricks = 0;

      // ゲームオブジェクト
      this.paddle = null;
      this.ball = null;
      this.bricks = null;

      // 入力・難易度
      this.cursors = null;
      this.spaceKey = null;
      this.activeDifficulty = null;

      // ポインター操作の状態
      this.pointerControlActive = false;
      this.pointerTargetX = CONFIG.width / 2;

      // パドル抜けフォールバック判定用
      this.lastBallY = 0;
    }

    /*
      Scene の初期化処理です。
      ここでは「ゲーム開始時に1回だけ必要な準備」をまとめて行います。

      主な流れ:
      1) 背景色と物理ワールド境界を設定する
      2) キーボード・ポインター入力を登録する
      3) ゲームオブジェクトを作る
      4) 初期状態（ready）へリセットする
    */
    create() {
      // カメラの背景色を設定する（何も描かれていない部分の色）。
      this.cameras.main.setBackgroundColor(CONFIG.colors.bgBottom);

      // 下方向だけ反射を無効にして、ミス判定を手動で処理する。
      this.physics.world.setBounds(0, 0, CONFIG.width, CONFIG.height);
      this.physics.world.setBoundsCollision(true, true, true, false);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.registerPointerControls();

      // 画面に必要な部品を作ってから、ゲーム状態を初期化する。
      this.buildWorldObjects();
      this.resetWholeGame();
    }

    /*
      ポインター入力のイベント登録をまとめる関数です。
      create 内に直接書くよりも、
      「何を登録しているか」をひとかたまりで把握しやすくなります。
    */
    registerPointerControls() {
      // タップ開始: 位置を記録し、ゲーム開始トリガーにも使う。
      this.input.on("pointerdown", (pointer) => {
        sfx.unlock();
        this.pointerControlActive = true;
        this.pointerTargetX = pointer.worldX;
        this.activateGame();
      });

      // ドラッグ中だけ目標 X を更新する。
      this.input.on("pointermove", (pointer) => {
        if (!pointer.isDown) {
          return;
        }
        this.pointerTargetX = pointer.worldX;
      });

      // pointerup / pointerupoutside の両方で同じ終了処理にする。
      const deactivatePointerControl = () => {
        this.pointerControlActive = false;
      };
      this.input.on("pointerup", deactivatePointerControl);
      this.input.on("pointerupoutside", deactivatePointerControl);
    }

    /*
      ステージ定義を取り出す小さなアクセサ関数です。
      CONFIG.stages[...] の直接参照を減らし、
      「ステージを使う」意図をコード上で明確にします。
    */
    getStage(stageIndex) {
      return CONFIG.stages[stageIndex];
    }

    /*
      ゲーム内の主要オブジェクトを作る関数です。
      - パドル: static body（自分は速度で動かない壁のような当たり判定）
      - ボール: dynamic body（速度を持って動く）
      - ブロック群: staticGroup（まとめて静的当たり判定を管理）

      あわせて、ボールがパドル/ブロックに当たったときのコールバックを登録します。
    */
    buildWorldObjects() {
      // add.rectangle は見た目の四角。physics.add.existing で当たり判定を持たせる。
      this.paddle = this.add.rectangle(
        CONFIG.width / 2,
        CONFIG.paddleY,
        TUNING.defaultPaddleWidth,
        CONFIG.paddleHeight,
        CONFIG.colors.paddle
      );
      // true を渡すと static body（自分では動かず、他を跳ね返す壁のような体）になる。
      this.physics.add.existing(this.paddle, true);

      // ボールは円として作る。
      this.ball = this.add.circle(
        CONFIG.width / 2,
        CONFIG.paddleY - CONFIG.ballRadius - TUNING.ballRestOffsetY,
        CONFIG.ballRadius,
        CONFIG.colors.ball
      );
      // false を渡すと dynamic body（速度で動く体）になる。
      this.physics.add.existing(this.ball, false);
      // 重力はこのゲームでは使わない。
      this.ball.body.setAllowGravity(false);
      // 画面端に当たる判定を有効化。
      this.ball.body.setCollideWorldBounds(true);
      // 反射係数1 = 速度をほぼそのまま反転させる。
      this.ball.body.setBounce(1, 1);

      // ブロックはまとめて staticGroup で管理する。
      this.bricks = this.physics.add.staticGroup();

      // ボールがパドル/ブロックに当たったときの処理を登録する。
      this.physics.add.collider(this.ball, this.paddle, this.onBallHitPaddle, null, this);
      this.physics.add.collider(this.ball, this.bricks, this.onBallHitBrick, null, this);
    }

    /*
      指定ステージの difficulty を、現在のプレイ設定へ反映する関数です。
      パドルは見た目の幅だけでなく、当たり判定サイズも同時に更新します。
      （見た目だけ変えると衝突ズレが起きるため）
    */
    applyStageDifficulty(stageIndex) {
      // 今のステージの難易度設定を取り出す。
      const stage = this.getStage(stageIndex);
      this.activeDifficulty = stage.difficulty;
      // パドル幅だけは見た目と当たり判定の両方を更新する必要がある。
      this.paddle.width = this.activeDifficulty.paddleWidth;
      this.paddle.fillColor = CONFIG.colors.paddle;
      this.paddle.body.setSize(this.activeDifficulty.paddleWidth, CONFIG.paddleHeight, true);
      this.paddle.body.updateFromGameObject();
    }

    /*
      ステージを構築し直す関数です。
      既存ブロックを消してから、新ステージのレイアウトを読み取り、
      ブロックを作成して残数を更新します。

      最後に:
      - ステージ HUD を更新
      - ボールをパドル上へ戻す（ready 状態）
    */
    buildStage(stageIndex) {
      // 前のステージのブロックを全部消す。
      this.bricks.clear(true, true);
      const stage = this.getStage(stageIndex);
      this.applyStageDifficulty(stageIndex);

      const brickData = createBrickMap(stage);
      // 設計図（brickData）をもとに1つずつブロックを置く。
      brickData.forEach((brick) => {
        const rect = this.add.rectangle(brick.x, brick.y, brick.width, brick.height, brick.color);
        this.physics.add.existing(rect, true);
        // setData で「耐久」「点数」をブロック自身に持たせる。
        rect.setData("hp", brick.hp);
        rect.setData("score", brick.score);
        this.bricks.add(rect);
      });

      this.remainingBricks = brickData.length;
      this.updateStageHud();
      this.resetBallToPaddle();
    }

    /*
      ボールをパドル上へ戻して停止させる関数です。
      ready 状態では毎フレームこれを呼び、
      「発射前はボールがパドルに乗っている」見た目を保ちます。
    */
    resetBallToPaddle() {
      this.ball.setPosition(this.paddle.x, this.paddle.y - CONFIG.ballRadius - TUNING.ballRestOffsetY);
      this.ball.body.setVelocity(0, 0);
      this.lastBallY = this.ball.y;
    }

    /*
      ボールを発射する関数です。
      ready 状態のときだけ有効で、
      左右どちらへ飛ぶかはランダムで決めます。
    */
    launchBall() {
      if (!this.isReadyPhase()) {
        // 発射済みなら何もしない。
        return;
      }

      // 左右どちらに飛ぶかはランダムで決める。
      const horizontal = Math.random() < 0.5 ? -1 : 1;
      this.ball.body.setVelocity(
        this.activeDifficulty.ballSpeed * horizontal,
        -this.activeDifficulty.ballSpeed
      );
      this.phase = PHASE.PLAYING;
      sfx.play("start");
      this.lastBallY = this.ball.y;
      hideOverlay();
    }

    /*
      「開始操作」の共通入口です。
      呼び出し元はタップ・クリック・スペースキーなど複数ありますが、
      ここに集約することで状態遷移を一元化しています。

      ルール:
      - playing 中は無視
      - over / win なら全体リセットしてから開始
      - それ以外は発射処理へ
    */
    activateGame() {
      if (this.isPlayingPhase()) {
        // プレイ中に開始操作されても無視する。
        return;
      }

      if (this.phase === PHASE.OVER || this.phase === PHASE.WIN) {
        // ゲーム終了後の開始操作は「最初からやり直し」にする。
        this.resetWholeGame();
      }

      this.launchBall();
    }

    /*
      ゲーム全体を初期状態へ戻す関数です。
      ステージ番号・スコア・ライフを初期値に戻し、
      ステージ1を構築したうえで開始メッセージを表示します。
    */
    resetWholeGame() {
      // 進行情報を初期値に戻す。
      this.phase = PHASE.READY;
      this.stageIndex = 0;
      this.score = 0;
      this.lives = CONFIG.initialLives;
      this.paddle.setPosition(CONFIG.width / 2, CONFIG.paddleY);
      this.buildStage(this.stageIndex);
      this.updateHud();
      showOverlay(UI_TEXT.start);
    }

    /*
      HUD のスコアとライフ表示を更新する関数です。
      内部状態（number）を DOM 表示（text）へ反映します。
    */
    updateHud() {
      scoreEl.textContent = String(this.score);
      livesEl.textContent = String(this.lives);
    }

    /*
      HUD のステージ表示を更新する関数です。
      - 何面目か（例: 2 / 3）
      - ステージ名
      - 進捗バー幅
      をまとめて反映します。
    */
    updateStageHud() {
      const current = this.stageIndex + 1;
      const total = CONFIG.stages.length;
      stageBadgeEl.textContent = String(current) + " / " + String(total);
      stageNameEl.textContent = this.getStage(this.stageIndex).name;
      stageProgressEl.style.width = String((current / total) * 100) + "%";
    }

    /*
      ボールとパドルの衝突コールバックです。
      実際の反射計算は reflectBallFromPaddle に委譲します。
    */
    onBallHitPaddle(ball, paddle) {
      if (!this.isPlayingPhase()) {
        return;
      }

      sfx.play("paddleBounce");
      this.reflectBallFromPaddle(ball, paddle);
    }

    /*
      パドル反射の共通ロジックです。

      仕組み:
      1) パドル中心からの当たり位置を -1〜+1 に正規化
      2) 当たり位置に応じて横速度を計算（端ほど大きい）
      3) 横速度が小さすぎる場合は最低値を保証
      4) 縦速度は必ず上向きへ
      5) めり込み防止のため、ボールをパドルの少し上に戻す
    */
    reflectBallFromPaddle(ball, paddle) {
      // 当たった位置を -1（左端）〜 +1（右端）に正規化する。
      const halfPaddleWidth = paddle.width / 2;
      const offset = (ball.x - paddle.x) / halfPaddleWidth;
      const clampedOffset = Phaser.Math.Clamp(offset, -1, 1);
      // 端で当てるほど横速度が大きくなる。
      const xVelocity = clampedOffset * (this.activeDifficulty.ballSpeed + this.activeDifficulty.ballBoostOnHit * TUNING.paddleBoostScale);
      const minHorizontal = this.activeDifficulty.ballMinHorizontalSpeed;
      // 横速度が小さすぎると縦往復だけになりやすいので、最低値を保証する。
      const safeX = Math.abs(xVelocity) < minHorizontal
        ? (xVelocity < 0 ? -minHorizontal : minHorizontal)
        : xVelocity;

      ball.body.setVelocityX(safeX);
      // Y方向は必ず上向き（マイナス）にする。
      ball.body.setVelocityY(-Math.abs(ball.body.velocity.y));
      // パドル内にめり込んだままだと連続衝突するので少し上へ戻す。
      ball.setY(paddle.y - paddle.height / 2 - CONFIG.ballRadius - TUNING.paddleReboundOffsetY);
      this.lastBallY = ball.y;
    }

    /*
      ボールとブロックの衝突コールバックです。
      - HP を減らす
      - 0 以下なら破壊して得点加算
      - 残りブロック0ならステージクリア処理へ
    */
    onBallHitBrick(ball, brick) {
      if (!this.isPlayingPhase()) {
        return;
      }

      sfx.play("brickHit");
      const hp = (brick.getData("hp") || 1) - 1;
      if (hp <= 0) {
        // 壊れたら消して、得点と残り数を更新する。
        this.remainingBricks -= 1;
        this.score += brick.getData("score") || TUNING.defaultBrickScore;
        this.updateHud();
        brick.destroy();
      } else {
        // まだ壊れない場合は耐久だけ減らす。
        brick.setData("hp", hp);
      }

      if (this.remainingBricks <= 0) {
        this.handleStageClear();
      }
    }

    /*
      ステージクリア時の進行処理です。
      最終ステージなら win にして完了メッセージを出し、
      まだ続きがあるなら次ステージを ready で構築します。
    */
    handleStageClear() {
      if (this.isFinalStage()) {
        this.phase = PHASE.WIN;
        sfx.play("win");
        showOverlay(UI_TEXT.gameWin);
        return;
      }

      this.stageIndex += 1;
      this.phase = PHASE.READY;
      this.paddle.setPosition(CONFIG.width / 2, CONFIG.paddleY);
      this.buildStage(this.stageIndex);
      sfx.play("stageClear");
      showOverlay(this.getStage(this.stageIndex).name + "\nタップして続ける");
    }

    /*
      ボール落下（ミス）時の処理です。
      ライフを減らし、
      - 0 なら over
      - 残っていれば ready に戻して再開待ち
      という分岐を行います。
    */
    handleLifeLost() {
      this.lives -= 1;
      this.updateHud();

      if (this.lives <= 0) {
        this.phase = PHASE.OVER;
        this.ball.body.setVelocity(0, 0);
        sfx.play("gameOver");
        showOverlay(UI_TEXT.gameOver);
        return;
      }

      this.phase = PHASE.READY;
      sfx.play("lifeLost");
      this.resetBallToPaddle();
      showOverlay(UI_TEXT.lifeLost);
    }

    /*
      現在が ready 状態かどうかを返す関数です。
      文字列を直接比較する処理を外へ隠すことで、
      呼び出し側は「何を知りたいか」だけを読めるようになります。
    */
    isReadyPhase() {
      return this.phase === PHASE.READY;
    }

    /*
      現在が playing 状態かどうかを返す関数です。
      更新処理や衝突処理での条件分岐をそろえるために使います。
    */
    isPlayingPhase() {
      return this.phase === PHASE.PLAYING;
    }

    /*
      現在ステージが最終ステージかを判定する関数です。
      次ステージへ進めるか、ゲームクリアにするかの分岐で使います。
    */
    isFinalStage() {
      return this.stageIndex + 1 >= CONFIG.stages.length;
    }

    /*
      入力に応じてパドル位置を更新する関数です。

      ルール:
      - ポインター操作中は pointerTargetX を優先
      - それ以外は左右キーで移動
      - 最後に画面外へ出ないよう Clamp する

      位置を更新したら、見た目の座標を物理ボディへ同期します。
    */
    updatePaddleFromInput() {
      const halfPaddle = this.paddle.width / 2;

      if (this.pointerControlActive) {
        this.paddle.x = Phaser.Math.Clamp(this.pointerTargetX, halfPaddle, CONFIG.width - halfPaddle);
      } else {
        const speed = this.activeDifficulty ? this.activeDifficulty.paddleSpeed : TUNING.defaultKeyboardSpeed;
        if (this.cursors.left.isDown) {
          this.paddle.x -= speed;
        }
        if (this.cursors.right.isDown) {
          this.paddle.x += speed;
        }
        this.paddle.x = Phaser.Math.Clamp(this.paddle.x, halfPaddle, CONFIG.width - halfPaddle);
      }

      this.paddle.body.updateFromGameObject();
    }

    /*
      パドル抜け（トンネリング）を減らすための補助判定です。
      物理エンジンの衝突が取りこぼされるケースに備えて、
      前フレームと今フレームのボール位置から
      「パドル上面をまたいだか」を手動で判定します。

      条件がそろったら reflectBallFromPaddle を呼び、
      通常衝突と同じ反射ロジックで処理します。
    */
    handlePaddlePassThroughFallback() {
      const halfPaddle = this.paddle.width / 2;
      const movingDown = this.ball.body.velocity.y > 0;
      const paddleTop = this.paddle.y - this.paddle.height / 2;
      const previousBottom = this.lastBallY + CONFIG.ballRadius;
      const currentBottom = this.ball.y + CONFIG.ballRadius;
      const withinPaddleX =
        this.ball.x >= this.paddle.x - halfPaddle - CONFIG.ballRadius &&
        this.ball.x <= this.paddle.x + halfPaddle + CONFIG.ballRadius;

      if (movingDown && previousBottom <= paddleTop && currentBottom >= paddleTop && withinPaddleX) {
        this.reflectBallFromPaddle(this.ball, this.paddle);
      }
    }

    /*
      毎フレーム呼ばれる更新関数です。

      この関数で行うこと:
      1) 入力に応じてパドル位置を更新
      2) スペースキーの開始操作を判定
      3) ready 中はボールをパドルに追従
      4) playing 中はパドル抜けフォールバック判定
      5) 画面下への落下判定
      6) 次フレーム比較用の座標保存
    */
    update() {
      this.updatePaddleFromInput();

      // スペースキーを「押した瞬間」だけ開始処理を呼ぶ。
      if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
        sfx.unlock();
        this.activateGame();
      }

      if (this.isReadyPhase()) {
        // 発射前はボールをパドルの上にくっつける。
        this.resetBallToPaddle();
      }

      if (this.isPlayingPhase()) {
        // 高速時の取りこぼし対策:
        // 前フレームと今フレームでボール下端がパドル上面をまたいだら、
        // 物理衝突が拾えなくても手動で反射させる。
        this.handlePaddlePassThroughFallback();
      }

      if (this.isPlayingPhase() && this.ball.y - CONFIG.ballRadius > CONFIG.height) {
        // 画面下へ完全に落ちたらミスとして扱う。
        this.handleLifeLost();
      }

      // 次フレーム比較用に、今回のYを保存しておく。
      this.lastBallY = this.ball.y;
    }
  }

  // Phaser 本体を既存 canvas 要素にマウントする。
  const canvasEl = getRequiredElement("gameCanvas");
  const game = new Phaser.Game({
    // CANVAS モードで既存 canvas#gameCanvas を使って描画する。
    type: Phaser.CANVAS,
    canvas: canvasEl,
    width: CONFIG.width,
    height: CONFIG.height,
    backgroundColor: "#07111f",
    physics: {
      default: "arcade",
      arcade: {
        debug: false
      }
    },
    scene: [BrickBreakerScene]
  });

  /*
    Scene インスタンスを安全に取得する関数です。
    起動直後など、まだ Scene が準備中の瞬間は null を返します。
    イベントハンドラから使うことで、初期化タイミングのズレを吸収できます。
  */
  function getSceneInstance() {
    // Scene がまだ作られていない瞬間は null を返す。
    return game.scene.keys.BrickBreakerScene || null;
  }

  // Overlay タップでも開始できるようにしておく。
  overlayEl.addEventListener("pointerdown", function () {
    sfx.unlock();
    const scene = getSceneInstance();
    if (scene) {
      scene.activateGame();
    }
  });

  // リスタートボタンはいつでも初期化を呼べる。
  restartBtn.addEventListener("click", function () {
    sfx.unlock();
    const scene = getSceneInstance();
    if (scene) {
      scene.resetWholeGame();
    }
  });
})();
