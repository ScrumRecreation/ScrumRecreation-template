// パドル・ボール・ブロックを「初期状態で作る」ことだけを担当するファイル。
// 生成した後の動かし方や当たり判定は、game.js など別の場所が担当する。
// こうして「何を作るか」と「どう動かすか」を分けておくと、
// 新しい種類のオブジェクトを追加するときも迷わずに済む。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく IIFE + window.BB という名前空間に公開する方式にしている。
(function () {
  /*
    パドル（プレイヤーが左右に動かす横長の板）を、
    画面の下の方、真ん中の位置に新しく作る関数です。
    この関数は「作る」だけで、その後パドルをどう動かすかは別の場所（game.js）の仕事です。
  */
  function createPaddle(CONFIG) {
    const width = CONFIG.paddleWidth;
    return {
      x: (CONFIG.width - width) / 2, // 画面の横幅のちょうど真ん中になるように計算する
      y: CONFIG.paddleY,             // 高さの位置は設定ファイルで決めた場所に固定
      width,
      height: CONFIG.paddleHeight
    };
  }

  /*
    ボールを、パドルのすぐ上に乗った状態で新しく作る関数です。
    ボールが最初に左と右のどちらに飛んでいくかは、
    Math.random()（0以上1未満のランダムな数）を使って半分の確率で決めています。
  */
  function createBall(CONFIG, paddle) {
    return {
      x: CONFIG.width / 2,                 // 横方向はパドルと同じく画面中央
      y: paddle.y - CONFIG.ballSize - 4,   // パドルのすぐ上に浮かせて配置
      size: CONFIG.ballSize,
      vx: CONFIG.ballSpeed * (Math.random() > 0.5 ? 1 : -1), // 左右どちらに飛ぶかを半分の確率で決める
      vy: -CONFIG.ballSpeed                 // マイナスの値 = 上方向に飛び出すという意味
    };
  }

  /*
    ブロックをすべて並べて、一つの配列として作る関数です。
    「行（横の並び）」と「列（縦の並び）」の2段階の繰り返し（二重ループ）を使い、
    上から順に、左から右にブロックを1つずつ置いていきます。
    ただし、実際に置くかどうかや、どの種類のブロックかは stage.blockLayout で決めます。
    空文字列（""）が入っている場所は、ブロックを置かない「空きマス」として扱います。
  */
  function createBricks(CONFIG, stage) {
    const bricks = [];
    const startX = 24; // 一番左のブロックのx座標
    const startY = 70; // 一番上のブロックのy座標
    const layout = stage?.blockLayout || [];

    for (let row = 0; row < layout.length; row += 1) {       // 上から下へ、行を1つずつ進める
      for (let col = 0; col < layout[row].length; col += 1) { // 左から右へ、列を1つずつ進める
        const blockTypeKey = layout[row][col];
        if (!blockTypeKey) {
          continue; // 空きマスなら、何も置かずに次へ進む
        }

        const blockType = CONFIG.blockTypes?.[blockTypeKey];
        if (!blockType) {
          continue; // 定義されていない種類なら、安全のため無視する
        }

        bricks.push({
          x: startX + col * (CONFIG.brickWidth + CONFIG.brickGap),  // 列の番号が大きいほど右にずらす
          y: startY + row * (CONFIG.brickHeight + CONFIG.brickGap), // 行の番号が大きいほど下にずらす
          width: CONFIG.brickWidth,
          height: CONFIG.brickHeight,
          color: blockType.color, // 種類ごとに決めた色を使う
          type: blockTypeKey, // どの種類のブロックかを残しておく
          hitPoints: blockType.hitPoints ?? 1, // 今は1だが、将来の拡張用に持たせておく
          score: blockType.score ?? CONFIG.scorePerBrick, // 種類ごとに得点を変えられるようにしておく
          alive: true // true = まだ壊されていない、という目印
        });
      }
    }

    return bricks;
  }

  window.BB = window.BB || {};
  window.BB.entities = { createPaddle, createBall, createBricks };
})();
