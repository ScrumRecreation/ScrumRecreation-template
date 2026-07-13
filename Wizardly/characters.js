// キャラクター・モンスターのライブラリ。
// ステータスの初期値はすべてここに集約する。

// パーティメンバーの基本ステータス（HP はレベル1の最大値）
const PARTY_TEMPLATE = [
  { name: 'アルフ', role: '戦士', maxHp: 20, attack: 4, defense: 2 },
  { name: 'ミラ', role: '魔術師', maxHp: 14, attack: 3, defense: 1 },
  { name: 'レオン', role: '盗賊', maxHp: 16, attack: 4, defense: 1 },
  { name: 'ソフィ', role: '司祭', maxHp: 15, attack: 3, defense: 1 }
];

// PARTY_TEMPLATE から、レベル・経験値を持つ実際のパーティ配列を作る
function createParty() {
  return PARTY_TEMPLATE.map((member) => ({
    ...member,
    hp: member.maxHp,
    level: 1,
    xp: 0,
    xpToNext: GAME_CONFIG.leveling.baseXpToNext
  }));
}

// 遭遇する可能性のあるモンスターの一覧
const MONSTER_LIBRARY = [
  { name: '灰のスケルトン', hp: 12, attack: 3, defense: 1, reward: 10, xp: 8 },
  { name: '火炎の霊', hp: 16, attack: 4, defense: 1, reward: 16, xp: 14 },
  { name: '古代ゴーレム', hp: 20, attack: 5, defense: 2, reward: 22, xp: 20 }
];

// MONSTER_LIBRARY からランダムに1体生成する
function createMonster() {
  const template = MONSTER_LIBRARY[Math.floor(Math.random() * MONSTER_LIBRARY.length)];
  return { ...template, maxHp: template.hp };
}
