// 非常に小さな Pub/Sub（発行・購読）の仕組み。
// ゲームの中心ロジック（当たり判定など）は「何が起きたか」を
// emit するだけにして、それにどう反応するか（HUD更新や画面表示など）は
// 呼び出し側が自由に on で登録できるようにする。
// 将来サウンドやエフェクトなどの反応を追加したいときも、
// 物理演算のコードを直接書き換えずに、購読を追加するだけで済む。
//
// サーバを介さず file:// で直接開いても動くように、
// ES Modules ではなく IIFE + window.BB という名前空間に公開する方式にしている。
(function () {
  /*
    ・on(eventName, handler)  : このイベント名が発生したときに handler を呼んでほしいと登録する
    ・emit(eventName, payload): このイベント名で登録された handler をすべて呼び出す（発生させる）
    listeners は「イベント名 → 呼び出す関数のリスト」をまとめて管理する台帳のようなものです。
  */
  function createEmitter() {
    const listeners = new Map();

    /*
      あるイベント名に対して、呼び出してほしい関数（handler）を登録する。
      同じイベント名に対して何回でも on を呼び、複数の関数を並べて登録できる。
    */
    function on(eventName, handler) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, []); // まだ登録がないイベントなので、空のリストを作っておく
      }
      listeners.get(eventName).push(handler);
    }

    /*
      あるイベント名で登録されている関数を、すべて順に呼び出す。
      payload は必要に応じて渡す「付属の情報」（例: メッセージの文字列）です。
      登録されていないイベントだった場合は、何もしないで終了する。
    */
    function emit(eventName, payload) {
      const handlers = listeners.get(eventName);
      if (!handlers) {
        return;
      }
      for (const handler of handlers) {
        handler(payload);
      }
    }

    return { on, emit };
  }

  window.BB = window.BB || {};
  window.BB.events = { createEmitter };
})();
