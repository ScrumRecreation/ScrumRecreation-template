// 迷宮のマップ情報。レイアウト・タイル種別・配色をここに集約する。
const TILE_TYPES = {
  empty: 0,
  wall: 1,
  door: 2,
  key: 3,
  exit: 4,
  treasure: 5,
  altar: 6,
  monster: 7
};

// 一人称視点の壁の色（TILE_TYPES に対応）
const WALL_COLORS = {
  [TILE_TYPES.wall]: '#6d7f8f',
  [TILE_TYPES.door]: '#7f5732',
  [TILE_TYPES.key]: '#8ee7ff',
  [TILE_TYPES.exit]: '#6dff95',
  [TILE_TYPES.treasure]: '#f5c542',
  [TILE_TYPES.altar]: '#c28cff',
  [TILE_TYPES.monster]: '#ff6b6b'
};

// ミニマップ上の色（TILE_TYPES に対応、未設定は default を使う）
const MINIMAP_COLORS = {
  [TILE_TYPES.wall]: '#233544',
  [TILE_TYPES.door]: '#73441f',
  [TILE_TYPES.key]: '#7ee8ff',
  [TILE_TYPES.exit]: '#59ff95',
  [TILE_TYPES.treasure]: '#f5c542',
  [TILE_TYPES.altar]: '#c28cff',
  [TILE_TYPES.monster]: '#ff6b6b',
  default: '#10202d'
};

// 迷宮の基本構造（0:通路 1:壁 2:扉）
const BASE_MAP_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 3, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 4, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

// 基本構造の上に配置する固定オブジェクト（宝箱・祭壇・怪物・鍵など）
const MAP_FEATURES = [
  { x: 3, y: 2, tile: TILE_TYPES.treasure },
  { x: 8, y: 4, tile: TILE_TYPES.altar },
  { x: 4, y: 7, tile: TILE_TYPES.monster },
  { x: 6, y: 8, tile: TILE_TYPES.treasure },
  { x: 8, y: 3, tile: TILE_TYPES.key }
];

// 新しい探索用マップ（配列）を生成する
function createMapInstance() {
  const grid = BASE_MAP_LAYOUT.map((row) => [...row]);
  MAP_FEATURES.forEach(({ x, y, tile }) => {
    grid[y][x] = tile;
  });
  return grid;
}
