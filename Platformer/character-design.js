// キャラクターの見た目を別ファイルにまとめた設定
// 形の情報もここに入れて、描画ロジックは別で使い回す
const characterDesign = {
  player: {
    body: '#e74c3c',
    accent: '#ffffff',
    eye: '#ffffff',
    detail: '#f8c84f',
    shadow: '#8f2c22',
    cap: '#d63b2f',
    capAccent: '#f8c84f',
    shirt: '#ffffff',
    pants: '#2f4f6f',
    shoe: '#3f2f24',
    face: '#f2b38f',
    shape: {
      head: { width: 12, height: 10, offsetX: 7, offsetY: 2 },
      torso: { width: 12, height: 12, offsetX: 7, offsetY: 12 },
      arm: { width: 3, height: 8, offsetX: 2, offsetY: 15 },
      leg: { width: 4, height: 8, offsetX: 8, offsetY: 24 },
      foot: { width: 6, height: 3, offsetX: 7, offsetY: 32 },
    },
    animation: {
      idle: { stepOffset: 0, armOffset: 0, bob: 0 },
      walk: { stepOffset: 1, armOffset: 0.3, bob: 0.4, frameDuration: 6 },
      jump: { stepOffset: 0, armOffset: 0.2, bob: 0.6 },
    },
  },
  enemy: {
    body: '#2d9c5d',
    accent: '#ffffff',
    eye: '#ffffff',
    detail: '#f4d35e',
    shadow: '#1f6b3d',
    cap: '#6b3f16',
    capAccent: '#f4d35e',
    trouser: '#3e5b2b',
    shoe: '#2f3521',
    shape: {
      head: { width: 12, height: 10, offsetX: 7, offsetY: 4 },
      torso: { width: 14, height: 14, offsetX: 6, offsetY: 14 },
      arm: { width: 4, height: 8, offsetX: 2, offsetY: 18 },
      leg: { width: 4, height: 8, offsetX: 8, offsetY: 28 },
      foot: { width: 6, height: 4, offsetX: 7, offsetY: 36 },
    },
    animation: {
      idle: { stepOffset: 0, armOffset: 0, bob: 0 },
      walk: { stepOffset: 1, armOffset: 0.3, bob: 0.4, frameDuration: 6 },
    },
  },
};
