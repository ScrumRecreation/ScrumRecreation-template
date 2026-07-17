// 当たり判定に関する「図形の位置関係を計算するだけ」の処理を集めたファイル。
// ゲームの状態（得点やライフなど）を一切持たないので、
// 将来ボール以外の何か（パワーアップなど）を追加しても、そのまま再利用できる。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく IIFE + window.BB という名前空間に公開する方式にしている。
(function () {
  /*
    円（ボール）と四角形（パドルやブロック）が重なっているかどうかを判定する関数です。
    「重なっている」とは、ボールの一部が四角形の中に入り込んでいる状態のことです。

    考え方はとてもシンプルです。
    もしボールが四角形の「左」「右」「上」「下」のどこかにすっぽり離れていたら、
    重なっていないと言えます。
    逆に、その4つのどこにも離れていなければ、必ず重なっています。
    この関数では、その「4つとも離れていない」ことを確認しています。

    circle: ボールの情報 { x: 中心のx座標, y: 中心のy座標, size: 半径 }
    rect:   四角形の情報 { x, y: 左上の座標, width: 横幅, height: 高さ }
  */
  function circleIntersectsRect(circle, rect) {
    return (
      circle.x + circle.size >= rect.x &&            // ボールの右端が、四角形の左端より右にある（左に離れていない）
      circle.x - circle.size <= rect.x + rect.width && // ボールの左端が、四角形の右端より左にある（右に離れていない）
      circle.y + circle.size >= rect.y &&              // ボールの下端が、四角形の上端より下にある（上に離れていない）
      circle.y - circle.size <= rect.y + rect.height   // ボールの上端が、四角形の下端より上にある（下に離れていない）
    );
  }

  /*
    ボールがブロックにぶつかったとき、「横から」ぶつかったのか「縦から」ぶつかったのかを
    判定する関数です。ぶつかった方向によって、跳ね返る向きを変える必要があります。

    やり方は「めり込んでいる量（重なっている深さ）」を比べることです。
    ボールがブロックの左右方向にどれだけめり込んでいるか（overlapX）と、
    ボールがブロックの上下方向にどれだけめり込んでいるか（overlapY）を計算し、
    めり込みが浅い（小さい）方こそが「実際にぶつかった方向」だと考えます。
    例えば横方向のめり込みがとても浅ければ、横からかすっただけ、という意味になります。
  */
  function shallowerOverlapAxis(circle, rect) {
    // ボールが左右どちら側からめり込んでいても、小さい方（浅い方）の値を使う
    const overlapX = Math.min(
      circle.x + circle.size - rect.x,
      rect.x + rect.width - (circle.x - circle.size)
    );
    // ボールが上下どちら側からめり込んでいても、小さい方（浅い方）の値を使う
    const overlapY = Math.min(
      circle.y + circle.size - rect.y,
      rect.y + rect.height - (circle.y - circle.size)
    );
    // 横方向のめり込みの方が浅ければ "x"、そうでなければ "y" を返す
    return overlapX < overlapY ? "x" : "y";
  }

  /*
    数値を「これより小さくならない・これより大きくならない」という範囲に収める関数です。
    たとえば clamp(150, 0, 100) は、150 が 100 より大きいので 100 を返します。
    clamp(-10, 0, 100) は、-10 が 0 より小さいので 0 を返します。
    clamp(50, 0, 100) は、範囲の中に収まっているので、そのまま 50 を返します。

    この関数を使うことで、パドルが画面の左右からはみ出さないようにしています。
  */
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.BB = window.BB || {};
  window.BB.collision = { circleIntersectsRect, shallowerOverlapAxis, clamp };
})();
