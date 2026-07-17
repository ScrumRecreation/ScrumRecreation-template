// ゲーム全体で使う設定値をまとめたファイル。
// 数字を直接コードに書かず、ここに集めることで調整しやすくしている。
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく window.BB という名前空間に公開する方式にしている。
window.BB = window.BB || {};
const STATIC_LAYOUTS = window.BB.layouts || {};

window.BB.CONFIG = {
  // 画面サイズ
  width: 360, // ゲーム画面の幅
  height: 520, // ゲーム画面の高さ

  // パドル設定
  paddleWidth: 76, // パドルの幅
  paddleHeight: 12, // パドルの高さ
  paddleY: 476, // パドルのY座標
  paddleSpeed: 7, // キーボード操作時、1フレームで動く距離

  // ボール設定
  ballSize: 5, // ボールのサイズ
  ballSpeed: 4, // ボールの初期速度
  ballBoostOnHit: 1.2, // パドルの端に当たったときの反射の強さ
  ballMinHorizontalSpeed: 1.5, // ボールが真上/真下だけに進み続けないための下限速度

  // ブロック設定
  brickRows: 4, // ブロックの行数
  brickCols: 6, // ブロックの列数
  brickHeight: 20, // ブロックの高さ
  brickWidth: 46, // ブロックの幅
  brickGap: 10, // ブロック間の隙間
  brickField: {
    left: 8,
    right: 8,
    top: 40,
    bottom: 360,
    minGap: 1
  },
  blockTypes: {
    A: {
      color: "#ff6b6b", // Aタイプの色
      hitPoints: 1, // 今は1回当たると壊れる
      score: 10 // 今は従来どおり10点
    },
    B: {
      color: "#6c63ff", // Bタイプの色
      hitPoints: 1, // 今は1回当たると壊れる
      score: 10 // 今は従来どおり10点
    }
  },

  // ゲーム進行設定
  initialLives: 3, // 初期ライフ数
  scorePerBrick: 10, // 1つのブロックを壊したときの得点
  sound: {
    enabled: true, // 効果音を使うかどうか
    masterVolume: 0.22, // 全体の音量の土台
    tones: {
      start: { type: "sine", frequency: 660, endFrequency: 990, duration: 0.08, volume: 0.9 }, // ゲーム開始の音
      paddleBounce: { type: "triangle", frequency: 300, endFrequency: 380, duration: 0.035, volume: 0.5 }, // パドルに当たった音
      wallBounce: { type: "triangle", frequency: 360, endFrequency: 460, duration: 0.03, volume: 0.35 }, // 壁に当たった音
      brickHit: { type: "square", frequency: 600, endFrequency: 280, duration: 0.045, volume: 0.55 }, // ブロックを壊した音
      lifeLost: { type: "sawtooth", frequency: 180, endFrequency: 95, duration: 0.14, volume: 0.55 }, // ライフを失った音
      gameOver: { type: "sawtooth", frequency: 150, endFrequency: 75, duration: 0.2, volume: 0.7 }, // ゲームオーバーの音
      stageClear: { type: "sine", frequency: 523.25, endFrequency: 880, duration: 0.12, volume: 0.7 }, // ステージクリアの音
      win: { type: "sine", frequency: 523.25, endFrequency: 1174.66, duration: 0.22, volume: 0.85 } // 全ステージクリアの音
    }
  },
  /*
    ステージは「この順番で遊ぶ問題集」のようなものです。
    1つのステージには、
    ・そのステージの名前
    ・難しさの設定
    ・ブロックの並べ方
    がまとまっています。

    game.js はこの配列を上から順に読み、
    1つ目が終わったら2つ目、2つ目が終わったら3つ目へ進みます。
    つまり、ここを増やすだけでステージ数を増やせるようにしています。
  */
  stages: [
    /*
      Stage 1 は「最初の練習用ステージ」です。
      パドルを少し広めにして、ボールの速さも標準的にしています。
      ブロックの並びも少しだけ空きマスを入れて、最初は取り組みやすくしています。
    */
    {
      name: "Lv.1 はじめの一歩",
      // difficulty は、このステージをどれくらい難しくするかをまとめた設定です。
      // 数字をばらばらに置かず、1つの箱に入れておくと、
      // 後から「このステージだけパドルを短くする」などの調整がしやすくなります。
      difficulty: {
        // パドルの横幅です。広いほどボールを受け止めやすくなります。
        paddleWidth: 72,
        // 1フレームでパドルがどれだけ動くかです。大きいほど操作しやすくなります。
        paddleSpeed: 10,
        // ボールの基本スピードです。。
        ballSpeed: 2,
        // パドルに当たったとき、どれだけ強く跳ね返るかを表します。
        // 大きいほど、当たり方で左右の飛び方が大きく変わります。
        ballBoostOnHit: 1.2,
        // ボールが真上や真下だけを行き来しないようにするための下限です。
        ballMinHorizontalSpeed: 1.5
      },
      // blockLayout は layouts.js の静的2次元配列を参照する。
      blockLayout: STATIC_LAYOUTS.stage1Heart || []
    },
    /*
      Stage 2 は少しだけ難しくしたステージです。
      パドルを細くして、ブロックの並びも交互に変えてあります。
      こうすると、ステージが進んだことが見た目でもわかります。
    */
    {
      name: "Lv.2 試練のとき",
      difficulty: {
        paddleWidth: 84,
        paddleSpeed: 9,
        ballSpeed: 3,
        ballBoostOnHit: 1.25,
        ballMinHorizontalSpeed: 1.7
      },
      blockLayout: STATIC_LAYOUTS.stage2Star || []
    },
    /*
      Stage 3 は今のところ最後のステージです。
      パドルがさらに細くなり、ボールも少し速くなるので、
      ここが現時点でのゴールになります。
    */
    {
      name: "Lv.3 最後の挑戦",
      difficulty: {
        paddleWidth: 76,
        paddleSpeed: 8,
        ballSpeed: 3.5,
        ballBoostOnHit: 1.3,
        ballMinHorizontalSpeed: 1.9
      },
      blockLayout: STATIC_LAYOUTS.stage3Crown || []
    }
  ], // 現時点で用意している3つのステージ定義

  // 色設定
  colors: { // 色の設定
    bgTop: "#12213d", // 背景の上部色
    bgBottom: "#07111f", // 背景の下部色
    paddle: "#74f7ff", // パドルの色
    ball: "#ffe29a", // ボールの色
    brick1: "#ff6b6b", // 1行目ブロックの色
    brick2: "#6c63ff", // 2行目ブロックの色
    glow: "#9fe8ff" // 発光エフェクトの色
  }
};
