// ゲーム全体の調整パラメータ。数値だけをここに集約し、
// script.js からはこの値を参照するだけにする。
const GAME_CONFIG = {
  map: {
    width: 11,
    height: 11
  },
  player: {
    startX: 1.5,
    startY: 1.5,
    startAngle: Math.PI / 2,
    moveSpeed: 0.08,
    turnSpeed: 0.06
  },
  encounter: {
    // プレイヤーが1マス進むたびに判定する遭遇率
    shallowChance: 0.08,
    deepChance: 0.16,
    deepThresholdY: 3,
    // 戦闘後、次に遭遇判定を行うまでに消費する歩数
    cooldownSteps: 6
  },
  economy: {
    startingPotions: 2,
    treasureGold: 12,
    potionDropChance: 0.35,
    potionHealAmount: 8
  },
  combat: {
    fleeChance: 0.5,
    heroDamageVariance: 3,
    enemyDamageVariance: 2
  },
  leveling: {
    baseXpToNext: 20,
    xpGrowthRate: 1.35,
    hpGainPerLevel: 4,
    attackGainPerLevel: 1,
    defenseGainEveryNLevels: 2
  },
  log: {
    maxMessages: 10,
    maxCombatLogEntries: 6
  },
  rendering: {
    fieldOfView: Math.PI / 3,
    minimapCanvasSize: 180,
    minimapCellSize: 14,
    minimapOffset: 12
  }
};
