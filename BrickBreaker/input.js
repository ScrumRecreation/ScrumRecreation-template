// キーボードとポインター（マウス・タッチ）の「入力の状態」だけを管理するファイル。
// パドルをどう動かすかは知らず、「今どちらのキーが押されているか」
// 「今どこを指しているか」を外部に伝えることだけを担当する。
// 入力の取り方（例: ゲームパッド対応など）を増やすときは、
// このファイルだけを見ればよい。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく IIFE + window.BB という名前空間に公開する方式にしている。
(function () {
/*
  入力の仕組み全体を作る関数です。
  呼び出し側（game.js）には、今キーが押されているかを表す keys と、
  今指やマウスでタップ（タッチ）しているかを確認する関数を返しています。
  onActivate は、ゲームを始めたいとき（スペースキーやタップ）に呼び出す関数で、
  呼び出し側から渡してもらいます。
*/
function createInputController(canvas, CONFIG, onActivate) {
  const keys = { left: false, right: false };
  let pointerActive = false;
  let pointerX = CONFIG.width / 2;

  /*
    指やマウスの画面上の位置（clientX）を、
    Canvas の中で使っているx座標に変換する関数です。
    画面の表示サイズと Canvas の実際の幅が違っていても、
    scaleX で比率を揃えているので、どんな画面サイズでもズレなく位置を求められます。
  */
  function setPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.width / rect.width;
    pointerX = (event.clientX - rect.left) * scaleX;
    pointerActive = true;
  }

  // キーボード操作を受け付けるイベントです。
  // 矢印キーでパドルを動かし、スペースキーで開始できます。
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "Left") {
      keys.left = true;
    }
    if (event.key === "ArrowRight" || event.key === "Right") {
      keys.right = true;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      onActivate();
    }
  });

  // キーを離したときに、動かす方向のフラグを戻します。
  window.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft" || event.key === "Left") {
      keys.left = false;
    }
    if (event.key === "ArrowRight" || event.key === "Right") {
      keys.right = false;
    }
  });

  // 他のアプリに切り替えたりタブを離れたりしたとき、
  // 矢印キーを押しっぱなしにしたままになると、
  // 戻ってきたときにパドルが勝手に動きつづけてしまう。
  // それを防ぐため、フォーカスが外れたら入力状態を全てリセットする。
  window.addEventListener("blur", () => {
    keys.left = false;
    keys.right = false;
    pointerActive = false;
  });

  // Canvas をタップしたときもゲームを開始します。
  // さらに、タッチ位置を記録してパドルの操作に使います。
  canvas.addEventListener("pointerdown", (event) => {
    setPointerPosition(event);
    onActivate();
  });

  // タッチやマウスの移動中にパドルを動かすためのイベントです。
  // ボタンが押されている間だけ、位置を更新します。
  canvas.addEventListener("pointermove", (event) => {
    if (event.buttons === 1 || event.pointerType === "touch") {
      setPointerPosition(event);
    }
  });

  // タッチやマウスのボタンを離したら、パドル操作を止めます。
  canvas.addEventListener("pointerup", () => {
    pointerActive = false;
  });

  canvas.addEventListener("pointerleave", () => {
    pointerActive = false;
  });

  return {
    keys,
    isPointerActive: () => pointerActive,
    getPointerX: () => pointerX
  };
}

  window.BB = window.BB || {};
  window.BB.input = { createInputController };
})();
