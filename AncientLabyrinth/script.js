const canvas = document.getElementById('viewCanvas');
const ctx = canvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');
const overlayEl = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const objectiveValueEl = document.getElementById('objectiveValue');
const keyValueEl = document.getElementById('keyValue');
const treasureValueEl = document.getElementById('treasureValue');
const statusValueEl = document.getElementById('statusValue');
const potionValueEl = document.getElementById('potionValue');
const messageListEl = document.getElementById('messageList');
const partyListEl = document.getElementById('partyList');
const battleOverlayEl = document.getElementById('battleOverlay');
const battleTitleEl = document.getElementById('battleTitle');
const battleEnemyNameEl = document.getElementById('battleEnemyName');
const battleEnemyHpBarEl = document.getElementById('battleEnemyHpBar');
const battleEnemyHpTextEl = document.getElementById('battleEnemyHpText');
const battleActorEl = document.getElementById('battleActor');
const battleHintEl = document.getElementById('battleHint');
const partyHpListEl = document.getElementById('partyHpList');
const battleLogEl = document.getElementById('battleLog');
const battleAttackBtnEl = document.getElementById('battleAttackBtn');
const battlePotionBtnEl = document.getElementById('battlePotionBtn');
const battleFleeBtnEl = document.getElementById('battleFleeBtn');
const endOverlayEl = document.getElementById('endOverlay');
const endCardEl = document.getElementById('endCard');
const endEyebrowEl = document.getElementById('endEyebrow');
const endTitleEl = document.getElementById('endTitle');
const endCopyEl = document.getElementById('endCopy');
const endGoldEl = document.getElementById('endGold');
const endTreasuresEl = document.getElementById('endTreasures');
const endRestartBtn = document.getElementById('endRestartBtn');

// マップ・キャラクターのデータは mapData.js / characters.js を、
// 数値パラメータは config.js の GAME_CONFIG を参照する。
let MAP = [];

const gameState = {
  phase: 'title',
  player: { x: 0, y: 0, angle: 0, speed: 0, turnSpeed: 0 },
  party: [],
  inventory: { key: false, potions: 0 },
  treasures: 0,
  gold: 0,
  messages: [],
  openDoors: new Set(),
  win: false,
  combat: null,
  encounterCooldown: 0,
  lastCellKey: null,
  visited: new Set()
};

const keys = {};

function resetGame() {
  const { player, economy } = GAME_CONFIG;
  MAP = createMapInstance();
  gameState.phase = 'playing';
  gameState.player = {
    x: player.startX,
    y: player.startY,
    angle: player.startAngle,
    speed: player.moveSpeed,
    turnSpeed: player.turnSpeed
  };
  gameState.party = createParty();
  gameState.inventory.key = false;
  gameState.inventory.potions = economy.startingPotions;
  gameState.treasures = 0;
  gameState.gold = 0;
  gameState.messages = [
    '古代迷宮に足を踏み入れた。',
    '封印の鍵を見つけ、出口の扉を開けるのが目的だ。',
    '怪物と遭遇することもある。薬と宝を活用しよう。'
  ];
  gameState.openDoors = new Set();
  gameState.win = false;
  gameState.combat = null;
  gameState.encounterCooldown = 0;
  gameState.lastCellKey = `${Math.floor(gameState.player.x)},${Math.floor(gameState.player.y)}`;
  gameState.visited = new Set([gameState.lastCellKey]);
  overlayEl.classList.add('hidden');
  endOverlayEl.classList.add('hidden');
  render();
}

function getTile(x, y) {
  const { width, height } = GAME_CONFIG.map;
  if (x < 0 || y < 0 || x >= width || y >= height) return TILE_TYPES.wall;
  const coordKey = `${Math.floor(x)},${Math.floor(y)}`;
  if (gameState.openDoors.has(coordKey)) return TILE_TYPES.empty;
  return MAP[Math.floor(y)][Math.floor(x)];
}

function addMessage(message, tone = 'info') {
  gameState.messages.push(message);
  if (gameState.messages.length > GAME_CONFIG.log.maxMessages) {
    gameState.messages.shift();
  }
  if (gameState.combat) {
    gameState.combat.log.push({ text: message, tone: tone === 'ally' ? 'ally' : 'enemy' });
    if (gameState.combat.log.length > GAME_CONFIG.log.maxCombatLogEntries) {
      gameState.combat.log.shift();
    }
  }
}

function render() {
  drawScene();
  drawMinimap();
  renderHud();
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  minimapCanvas.width = GAME_CONFIG.rendering.minimapCanvasSize;
  minimapCanvas.height = GAME_CONFIG.rendering.minimapCanvasSize;
  render();
}

function drawScene() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.clearRect(0, 0, width, height);

  const horizon = height / 2;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#0b1222');
  sky.addColorStop(1, '#26415b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, horizon);

  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, '#1f2b33');
  floor.addColorStop(1, '#071118');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);

  const fov = GAME_CONFIG.rendering.fieldOfView;
  const rayCount = width;
  const step = width / rayCount;

  for (let column = 0; column < rayCount; column += 1) {
    const rayAngle = gameState.player.angle - fov / 2 + (column / rayCount) * fov;
    const rayDirX = Math.cos(rayAngle);
    const rayDirY = Math.sin(rayAngle);

    let mapX = Math.floor(gameState.player.x);
    let mapY = Math.floor(gameState.player.y);
    let deltaDistX = Math.abs(1 / rayDirX);
    let deltaDistY = Math.abs(1 / rayDirY);
    let stepX = rayDirX < 0 ? -1 : 1;
    let stepY = rayDirY < 0 ? -1 : 1;

    let sideDistX = rayDirX < 0
      ? (gameState.player.x - mapX) * deltaDistX
      : (mapX + 1 - gameState.player.x) * deltaDistX;
    let sideDistY = rayDirY < 0
      ? (gameState.player.y - mapY) * deltaDistY
      : (mapY + 1 - gameState.player.y) * deltaDistY;

    let hit = false;
    let side = 0;
    let tile = TILE_TYPES.empty;

    while (!hit) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      tile = getTile(mapX, mapY);
      if (tile !== TILE_TYPES.empty) {
        hit = true;
      }
    }

    const perpWallDist = side === 0
      ? (mapX - gameState.player.x + (1 - stepX) / 2) / rayDirX
      : (mapY - gameState.player.y + (1 - stepY) / 2) / rayDirY;

    const wallHeight = Math.max(1, Math.min(height, (height / Math.max(perpWallDist, 0.0001)) * 1.2));
    const wallTop = Math.max(0, height / 2 - wallHeight / 2);
    const wallBottom = Math.min(height, height / 2 + wallHeight / 2);

    const wallColor = WALL_COLORS[tile] || '#6d7f8f';
    const shade = Math.max(0.2, 1 - perpWallDist / 9);
    const r = Math.round(parseInt(wallColor.slice(1, 3), 16) * shade);
    const g = Math.round(parseInt(wallColor.slice(3, 5), 16) * shade);
    const b = Math.round(parseInt(wallColor.slice(5, 7), 16) * shade);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(column * step, wallTop, step + 1, wallBottom - wallTop);

    if (side) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.2 + Math.max(0, 0.15 - perpWallDist / 40)})`;
      ctx.fillRect(column * step, wallTop, step + 1, wallBottom - wallTop);
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(width / 2, height / 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.moveTo(width / 2 - 8, height / 2);
  ctx.lineTo(width / 2 + 8, height / 2);
  ctx.moveTo(width / 2, height / 2 - 8);
  ctx.lineTo(width / 2, height / 2 + 8);
  ctx.stroke();
}

function drawMinimap() {
  minimapCtx.clearRect(0, 0, minimapCanvas.width, minimapCanvas.height);
  minimapCtx.fillStyle = 'rgba(3, 9, 16, 0.85)';
  minimapCtx.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

  const { width: mapWidth, height: mapHeight } = GAME_CONFIG.map;
  const { minimapCellSize: cellSize, minimapOffset: offset } = GAME_CONFIG.rendering;

  for (let y = 0; y < mapHeight; y += 1) {
    for (let x = 0; x < mapWidth; x += 1) {
      if (!isRevealed(x, y)) {
        minimapCtx.fillStyle = '#050a12';
      } else {
        minimapCtx.fillStyle = MINIMAP_COLORS[MAP[y][x]] || MINIMAP_COLORS.default;
      }
      minimapCtx.fillRect(offset + x * cellSize, offset + y * cellSize, cellSize - 1, cellSize - 1);
    }
  }

  minimapCtx.fillStyle = '#ffd166';
  minimapCtx.beginPath();
  minimapCtx.arc(offset + gameState.player.x * cellSize, offset + gameState.player.y * cellSize, 3, 0, Math.PI * 2);
  minimapCtx.fill();
}

function renderHud() {
  objectiveValueEl.textContent = gameState.win
    ? '出口の扉を開けた'
    : gameState.inventory.key
      ? '出口の扉へ向かえ'
      : '鍵を探し、出口へ';
  keyValueEl.textContent = gameState.inventory.key ? '入手済み' : '未入手';
  treasureValueEl.textContent = `${gameState.treasures} / ${gameState.gold}G`;
  potionValueEl.textContent = `${gameState.inventory.potions}`;
  statusValueEl.textContent = gameState.win
    ? '迷宮を制覇した'
    : gameState.phase === 'combat'
      ? '戦闘中'
      : gameState.phase === 'playing'
        ? '探索中'
        : '待機中';

  renderParty();
  updateCombatUi();

  messageListEl.innerHTML = '';
  gameState.messages.slice().reverse().forEach((message) => {
    const item = document.createElement('li');
    item.textContent = message;
    messageListEl.appendChild(item);
  });
}

function renderParty() {
  partyListEl.innerHTML = '';
  gameState.party.forEach((hero, index) => {
    const memberEl = document.createElement('div');
    const isActive = gameState.phase === 'combat' && gameState.combat && gameState.combat.heroIndex === index;
    memberEl.className = `party-member${isActive ? ' active' : ''}${hero.hp <= 0 ? ' down' : ''}`;
    const xpPercent = Math.max(0, Math.min(100, (hero.xp / hero.xpToNext) * 100));
    memberEl.innerHTML = `
      <strong>${hero.name} · ${hero.role} Lv.${hero.level}</strong>
      <span>${hero.hp}/${hero.maxHp} HP${hero.hp <= 0 ? '(戦闘不能)' : ''}</span>
      <small>攻 ${hero.attack} 防 ${hero.defense}</small>
      <div class="xp-bar"><div class="xp-fill" style="width:${xpPercent}%"></div></div>
    `;
    partyListEl.appendChild(memberEl);
  });
}

function isRevealed(x, y) {
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (gameState.visited.has(`${x + dx},${y + dy}`)) return true;
    }
  }
  return false;
}

function isWalkable(x, y) {
  const tile = getTile(x, y);
  if (tile === TILE_TYPES.wall) return false;
  if (tile === TILE_TYPES.door) return gameState.openDoors.has(`${Math.floor(x)},${Math.floor(y)}`);
  return true;
}

function tryMove(forward) {
  if (gameState.phase !== 'playing') return;
  const moveAmount = gameState.player.speed * (forward ? 1 : -1);
  const nextX = gameState.player.x + Math.cos(gameState.player.angle) * moveAmount;
  const nextY = gameState.player.y + Math.sin(gameState.player.angle) * moveAmount;
  if (isWalkable(nextX, nextY)) {
    gameState.player.x = nextX;
    gameState.player.y = nextY;
    const cellKey = `${Math.floor(nextX)},${Math.floor(nextY)}`;
    if (cellKey !== gameState.lastCellKey) {
      gameState.lastCellKey = cellKey;
      gameState.visited.add(cellKey);
      handleStepEntered();
    }
  } else {
    addMessage('壁にぶつかった。');
  }
}

function handleStepEntered() {
  const { shallowChance, deepChance, deepThresholdY, cooldownSteps } = GAME_CONFIG.encounter;
  if (gameState.encounterCooldown > 0) {
    gameState.encounterCooldown -= 1;
    handleTile();
    return;
  }
  const encounterChance = gameState.player.y > deepThresholdY ? deepChance : shallowChance;
  if (Math.random() < encounterChance && !isSpecialTile(gameState.player.x, gameState.player.y)) {
    gameState.encounterCooldown = cooldownSteps;
    startCombat();
  } else {
    handleTile();
  }
}

function turn(direction) {
  gameState.player.angle += direction * gameState.player.turnSpeed;
}

function isSpecialTile(x, y) {
  const tile = getTile(x, y);
  return tile === TILE_TYPES.key || tile === TILE_TYPES.treasure || tile === TILE_TYPES.altar || tile === TILE_TYPES.exit || tile === TILE_TYPES.monster;
}

function handleTile() {
  const { treasureGold, potionDropChance } = GAME_CONFIG.economy;
  const tile = getTile(gameState.player.x, gameState.player.y);
  const coordKey = `${Math.floor(gameState.player.x)},${Math.floor(gameState.player.y)}`;
  if (tile === TILE_TYPES.key) {
    gameState.inventory.key = true;
    addMessage('古代の鍵を手に入れた。');
    MAP[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] = TILE_TYPES.empty;
  } else if (tile === TILE_TYPES.treasure) {
    gameState.treasures += 1;
    if (Math.random() < potionDropChance) {
      gameState.inventory.potions += 1;
      addMessage('宝箱を見つけた。薬を手に入れた。');
    } else {
      gameState.gold += treasureGold;
      addMessage('宝箱を見つけた。金貨を拾った。');
    }
    MAP[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] = TILE_TYPES.empty;
  } else if (tile === TILE_TYPES.altar) {
    gameState.party.forEach((hero) => {
      hero.hp = hero.maxHp;
    });
    addMessage('祈りの祭壇に触れた。仲間の傷は癒えた。');
    MAP[Math.floor(gameState.player.y)][Math.floor(gameState.player.x)] = TILE_TYPES.empty;
  } else if (tile === TILE_TYPES.monster) {
    startCombat();
  } else if (tile === TILE_TYPES.exit) {
    if (gameState.inventory.key) {
      gameState.phase = 'won';
      gameState.win = true;
      addMessage('出口の扉を開け、迷宮から抜けた。');
      showEndOverlay('won');
    } else {
      addMessage('出口は鍵でしか開かない。');
    }
  } else if (tile === TILE_TYPES.door) {
    gameState.openDoors.delete(coordKey);
  }
}

function interact() {
  if (gameState.phase !== 'playing') return;
  const forwardX = gameState.player.x + Math.cos(gameState.player.angle) * 0.75;
  const forwardY = gameState.player.y + Math.sin(gameState.player.angle) * 0.75;
  const tile = getTile(forwardX, forwardY);
  const coordKey = `${Math.floor(forwardX)},${Math.floor(forwardY)}`;

  if (tile === TILE_TYPES.door) {
    if (gameState.inventory.key) {
      if (gameState.openDoors.has(coordKey)) {
        gameState.openDoors.delete(coordKey);
        addMessage('扉を閉じた。');
      } else {
        gameState.openDoors.add(coordKey);
        addMessage('扉を開いた。');
      }
    } else {
      addMessage('鍵がないと開けられない。');
    }
  } else if (tile === TILE_TYPES.key) {
    gameState.inventory.key = true;
    addMessage('古代の鍵を見つけた。');
    MAP[Math.floor(forwardY)][Math.floor(forwardX)] = TILE_TYPES.empty;
  } else if (tile === TILE_TYPES.treasure) {
    gameState.treasures += 1;
    gameState.gold += GAME_CONFIG.economy.treasureGold;
    addMessage('宝箱を見つけた。');
    MAP[Math.floor(forwardY)][Math.floor(forwardX)] = TILE_TYPES.empty;
  } else {
    addMessage('何も見当たらない。');
  }
}

function startCombat() {
  if (gameState.phase !== 'playing') return;
  const enemy = createMonster();
  gameState.phase = 'combat';
  gameState.combat = {
    enemy,
    heroIndex: 0,
    log: []
  };
  while (gameState.party[gameState.combat.heroIndex] && gameState.party[gameState.combat.heroIndex].hp <= 0) {
    gameState.combat.heroIndex += 1;
  }
  addMessage(`${enemy.name} が現れた。`, 'enemy');
  updateCombatUi();
}

function updateCombatUi() {
  if (gameState.phase !== 'combat' || !gameState.combat) {
    battleOverlayEl.classList.add('hidden');
    return;
  }
  battleOverlayEl.classList.remove('hidden');
  const hero = gameState.party[gameState.combat.heroIndex];
  const enemy = gameState.combat.enemy;
  battleTitleEl.textContent = `${enemy.name} が現れた`;
  battleEnemyNameEl.textContent = enemy.name;
  battleEnemyHpTextEl.textContent = `HP ${enemy.hp}/${enemy.maxHp}`;
  battleEnemyHpBarEl.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
  battleActorEl.textContent = hero && hero.hp > 0 ? `${hero.name} の番です` : '仲間が立ち上がる必要がある';
  battleHintEl.textContent = hero && hero.hp > 0
    ? `${hero.role} の力で切り込め`
    : '誰かが立ち上がる必要がある';
  renderPartyHp();
  battleLogEl.innerHTML = '';
  gameState.combat.log.slice().reverse().forEach((entry) => {
    const line = document.createElement('div');
    line.textContent = entry.text;
    line.style.color = entry.tone === 'ally' ? '#6dff95' : '#ff7b7b';
    battleLogEl.appendChild(line);
  });
  battleAttackBtnEl.disabled = !hero || hero.hp <= 0;
  battlePotionBtnEl.disabled = !hero || hero.hp <= 0 || gameState.inventory.potions <= 0;
  battleFleeBtnEl.disabled = !hero || hero.hp <= 0;
}

function renderPartyHp() {
  partyHpListEl.innerHTML = '';
  gameState.party.forEach((hero) => {
    const row = document.createElement('div');
    row.className = 'party-hp-row';
    const percent = Math.max(0, (hero.hp / hero.maxHp) * 100);
    row.innerHTML = `
      <strong>${hero.name}</strong>
      <div class="hp-bar"><div class="hp-fill" style="width:${percent}%"></div></div>
      <small>${hero.hp}/${hero.maxHp} HP</small>
    `;
    partyHpListEl.appendChild(row);
  });
}

function getNextAliveHeroIndex(startIndex) {
  for (let offset = 0; offset < gameState.party.length; offset += 1) {
    const index = (startIndex + offset) % gameState.party.length;
    if (gameState.party[index].hp > 0) {
      return index;
    }
  }
  return -1;
}

function grantXp(amount) {
  const { xpGrowthRate, hpGainPerLevel, attackGainPerLevel, defenseGainEveryNLevels } = GAME_CONFIG.leveling;
  gameState.party.forEach((hero) => {
    if (hero.hp <= 0) return;
    hero.xp += amount;
    while (hero.xp >= hero.xpToNext) {
      hero.xp -= hero.xpToNext;
      hero.level += 1;
      hero.maxHp += hpGainPerLevel;
      hero.hp = hero.maxHp;
      hero.attack += attackGainPerLevel;
      if (hero.level % defenseGainEveryNLevels === 0) hero.defense += 1;
      hero.xpToNext = Math.round(hero.xpToNext * xpGrowthRate);
      addMessage(`${hero.name} はレベル ${hero.level} に上がった。`, 'ally');
    }
  });
}

function enemyStrike(hero) {
  if (!gameState.combat) return;
  const variance = GAME_CONFIG.combat.enemyDamageVariance;
  const damage = Math.max(1, gameState.combat.enemy.attack + Math.floor(Math.random() * variance) - hero.defense);
  hero.hp = Math.max(0, hero.hp - damage);
  addMessage(`${gameState.combat.enemy.name} が ${hero.name} に ${damage} ダメージ。`, 'enemy');
  if (hero.hp <= 0) {
    addMessage(`${hero.name} は倒れた。`, 'enemy');
  }
}

function performCombatAction(action) {
  if (gameState.phase !== 'combat' || !gameState.combat) return;
  const hero = gameState.party[gameState.combat.heroIndex];
  if (!hero || hero.hp <= 0) {
    gameState.combat.heroIndex = getNextAliveHeroIndex(gameState.combat.heroIndex + 1);
    updateCombatUi();
    return;
  }

  if (action === 'attack') {
    const variance = GAME_CONFIG.combat.heroDamageVariance;
    const damage = Math.max(1, hero.attack + Math.floor(Math.random() * variance) - gameState.combat.enemy.defense);
    gameState.combat.enemy.hp -= damage;
    addMessage(`${hero.name} が ${gameState.combat.enemy.name} に ${damage} ダメージ。`, 'ally');
  } else if (action === 'potion') {
    if (gameState.inventory.potions <= 0) return;
    const healAmount = GAME_CONFIG.economy.potionHealAmount;
    gameState.inventory.potions -= 1;
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
    addMessage(`${hero.name} が薬を飲み、${hero.hp} HP まで回復した。`, 'ally');
  } else if (action === 'flee') {
    if (Math.random() < GAME_CONFIG.combat.fleeChance) {
      gameState.phase = 'playing';
      gameState.combat = null;
      addMessage('退却に成功した。');
      updateCombatUi();
      return;
    }
    addMessage('退却に失敗した。', 'enemy');
  }

  if (gameState.combat.enemy.hp <= 0) {
    gameState.gold += gameState.combat.enemy.reward;
    gameState.treasures += 1;
    addMessage(`${gameState.combat.enemy.name} を倒した。${gameState.combat.enemy.reward}G を得た。`, 'ally');
    grantXp(gameState.combat.enemy.xp);
    gameState.phase = 'playing';
    gameState.combat = null;
    updateCombatUi();
    return;
  }

  enemyStrike(hero);
  if (gameState.phase !== 'combat') return;
  const nextIndex = getNextAliveHeroIndex(gameState.combat.heroIndex + 1);
  if (nextIndex < 0) {
    gameState.phase = 'gameover';
    addMessage('パーティ全員が倒れた。迷宮に沈んだ。', 'enemy');
    gameState.combat = null;
    updateCombatUi();
    showEndOverlay('gameover');
    return;
  }
  gameState.combat.heroIndex = nextIndex;
  updateCombatUi();
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'e'].includes(key)) {
    event.preventDefault();
  }
  keys[key] = true;

  if (key === 'e') {
    interact();
  }
}

function handleKeyUp(event) {
  keys[event.key.toLowerCase()] = false;
}

function showEndOverlay(kind) {
  endOverlayEl.classList.remove('hidden');
  endCardEl.classList.remove('victory', 'defeat');
  endGoldEl.textContent = `${gameState.gold}G`;
  endTreasuresEl.textContent = `${gameState.treasures}`;
  if (kind === 'won') {
    endCardEl.classList.add('victory');
    endEyebrowEl.textContent = '迷宮制覇';
    endTitleEl.textContent = '出口の扉を開いた';
    endCopyEl.textContent = '封印の鍵を手に、パーティは古代迷宮からの生還を果たした。';
  } else {
    endCardEl.classList.add('defeat');
    endEyebrowEl.textContent = '全滅';
    endTitleEl.textContent = 'パーティは倒れた';
    endCopyEl.textContent = '迷宮の闇に沈んだ。装備を整え、再挑戦しよう。';
  }
}

function update() {
  if (gameState.phase === 'playing') {
    if (keys['w'] || keys['arrowup']) tryMove(true);
    if (keys['s'] || keys['arrowdown']) tryMove(false);
    if (keys['a'] || keys['arrowleft']) turn(-1);
    if (keys['d'] || keys['arrowright']) turn(1);
  }
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

startBtn.addEventListener('click', resetGame);
restartBtn.addEventListener('click', resetGame);
endRestartBtn.addEventListener('click', resetGame);
battleAttackBtnEl.addEventListener('click', () => performCombatAction('attack'));
battlePotionBtnEl.addEventListener('click', () => performCombatAction('potion'));
battleFleeBtnEl.addEventListener('click', () => performCombatAction('flee'));
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('resize', resizeCanvas);

MAP = createMapInstance();
resizeCanvas();
loop();
