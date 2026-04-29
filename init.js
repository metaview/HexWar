// ============================================================
//  CONSTANTS
// ============================================================
const COLS = 35, ROWS = 25;
const HEX_SIZE = 28;
const HW = Math.sqrt(3) * HEX_SIZE;
const VERT_SPACING = HEX_SIZE * 1.5;
const UI_W = 240;

const COLOR_REACHABLE  = 'rgba(100,180,255,0.35)';
const COLOR_ATTACKABLE = 'rgba(255,80,80,0.42)';
const COLOR_SELECTED   = 'rgba(255,220,50,0.52)';

// Control zone: 2-3-2 diamond shape; center cell is impassable core
const _ZC = Math.floor(COLS/2), _ZR = Math.floor(2*ROWS/3);
const ZONE_CORE  = { col: _ZC, row: _ZR };
const ZONE_CELLS = [
  { col: _ZC-1, row: _ZR-1 }, { col: _ZC, row: _ZR-1 },
  { col: _ZC-1, row: _ZR   }, { col: _ZC+1, row: _ZR   },
  { col: _ZC-1, row: _ZR+1 }, { col: _ZC,   row: _ZR+1 },
];
const ZONE_CELLS_AROUND = [
  { col: _ZC-1, row: _ZR-2 }, { col: _ZC,   row: _ZR-2 }, { col: _ZC+1, row: _ZR-2 },
  { col: _ZC-2, row: _ZR-1 }, { col: _ZC+1, row: _ZR-1 },
  { col: _ZC-2, row: _ZR   }, { col: _ZC+2, row: _ZR   },
  { col: _ZC-2, row: _ZR+1 }, { col: _ZC+1, row: _ZR+1 },
  { col: _ZC-1, row: _ZR+2 }, { col: _ZC,   row: _ZR+2 }, { col: _ZC+1, row: _ZR+2 },
];

// ============================================================
//  TERRAIN
// ============================================================
const TERRAIN = {
  sand:     { color:'#c2b280', moveCost:1,   passable:true,  defBonus: 0 },
  grass:    { color:'#5a9e3b', moveCost:1,   passable:true,  defBonus: 0 },
  forest:   { color:'#2d5a1b', moveCost:2,   passable:true,  defBonus: 2 },
  mountain: { color:'#7a7a8a', moveCost:3,   passable:true,  defBonus: 3 },
  river:    { color:'#4a7fbf', moveCost:999, passable:false, defBonus: 0 },
  lake:     { color:'#2356a8', moveCost:999, passable:false, defBonus: 0 },
  bridge:   { color:'#8B5E3C', moveCost:1,   passable:true,  defBonus:-1 },
  swamp:    { color:'#4a7a3a', moveCost:999, passable:true,  defBonus:-1 },
};

// ============================================================
//  UNIT DEFINITIONS
// ============================================================
const UNIT_TYPES = {
  cavalry:  { symbol:'🐎', hp:10, atk:5, def:2, mov:6, range:1 },
  spear:    { symbol:'🔱', hp:12, atk:3, def:5, mov:4, range:1 },
  archer:   { symbol:'🏹', hp: 8, atk:5, def:2, mov:4, range:3 },
  sword:    { symbol:'⚔',  hp:14, atk:5, def:4, mov:3, range:1 },
  catapult: { symbol:'🪨', hp: 8, atk:7, def:1, mov:2, range:5 },
};

const TYPE_ADVANTAGE = {
  cavalry: { sword:   2 },
  spear:   { cavalry: 2 },
  sword:   { archer:  2 },
  archer:  { spear:   2 },
};

// ============================================================
//  STATE
// ============================================================
let canvas, ctx;
let map = [];
let units = [];
let camX = -HW, camY = -HEX_SIZE;
let zoom = 1;
const ZOOM_MIN = 0.4, ZOOM_MAX = 2.5;
let pinchStartDist = null, pinchStartZoom = 1, pinchStartCam = null;
let isDragging = false, dragStart = null, camStart = null;
let selectedUnit = null;
let reachableHexes = [];
let attackableHexes = [];
let combatFlashes = [];
let currentPlayer = 0;
let turnCount = 1;
let gamePhase = 'select';
let aiThinking = false;
let showDebugPaths = false;
let activeSeed = 0;

// Control zone state
let zoneOwner = -1;
let zoneBalance = 0;
let debugPaths = { player: [], ai: [] };
const ZONE_WIN_SCORE = 20;

function inZone(col, row) {
  return ZONE_CELLS.some(z => z.col===col && z.row===row);
}
function inZoneCore(col, row) {
  return col === ZONE_CORE.col && row === ZONE_CORE.row;
}

function evaluateZone() {
  const zUnits = units.filter(u => inZone(u.col, u.row));
  const owners = [...new Set(zUnits.map(u => u.owner))];
  zoneOwner = owners.length === 1 ? owners[0] : -1;
  if (zoneOwner === 0) {
    zoneBalance = Math.min(ZONE_WIN_SCORE, zoneBalance + 1);
    addLog(t('log_zone_player', (zoneBalance > 0 ? '+' : '') + zoneBalance), 'turn');
  } else if (zoneOwner === 1) {
    zoneBalance = Math.max(-ZONE_WIN_SCORE, zoneBalance - 1);
    addLog(t('log_zone_ai', (zoneBalance > 0 ? '+' : '') + zoneBalance), 'turn');
  }
}

// ============================================================
//  SEEDED RNG
// ============================================================
let seed = Date.now();
function rng()          { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; }
function rngRange(a, b) { return a + Math.floor(rng() * (b - a + 1)); }

// ============================================================
//  HEX MATH
// ============================================================
function hexToPixel(col, row) {
  return {
    x: HW * (col + 0.5 * (row & 1)),
    y: VERT_SPACING * row
  };
}

function pixelToHex(px, py) {
  const r = Math.round(py / VERT_SPACING);
  const c = Math.round(px / HW - 0.5 * (r & 1));
  return { col: c, row: r };
}

function hexNeighbors(col, row) {
  const even = [[-1,0],[1,0],[0,-1],[1,-1],[0,1],[1,1]];
  const odd  = [[-1,0],[1,0],[-1,-1],[0,-1],[-1,1],[0,1]];
  const dirs = (row & 1) ? even : odd;
  return dirs
    .map(([dc,dr]) => ({ col: col+dc, row: row+dr }))
    .filter(h => h.col >= 0 && h.col < COLS && h.row >= 0 && h.row < ROWS);
}

function hexDistance(c1, r1, c2, r2) {
  function toCube(c, r) {
    const x = c - (r - (r & 1)) / 2;
    return { x, y: -x - r, z: r };
  }
  const a = toCube(c1, r1), b = toCube(c2, r2);
  return Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y), Math.abs(a.z-b.z));
}

// ============================================================
//  MAP GENERATION
// ============================================================
function generateMap(forceSeed) {
  seed = (forceSeed !== undefined && forceSeed !== null) ? forceSeed : (1000 + Math.floor(Math.random() * 9000));
  activeSeed = seed;

  const noise = Array.from({ length: ROWS }, () => new Float32Array(COLS));
  const peaks = Array.from({ length: 2 }, () => ({
    c: rngRange(5, COLS-6), r: rngRange(5, ROWS-6), h: 0.7 + rng() * 0.3
  }));
  const lakes = Array.from({ length: 2 }, () => ({
    c: rngRange(5, COLS-2), r: rngRange(5, ROWS-2), h: 0.7 + rng() * 0.3
  }));

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let h = 0.28 + rng() * 0.15;
      for (const p of peaks) {
        const d = Math.sqrt((c - p.c) ** 2 + (r - p.r) ** 2);
        h += p.h * Math.max(0, 1 - d / 8);
      }
      for (const l of lakes) {
        const d = Math.sqrt((c - l.c) ** 2 + (r - l.r) ** 2);
        h -= l.h * Math.max(0, 1 - d / 8);
      }
      noise[r][c] = Math.min(1, Math.max(0, h));
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    const tmp = noise.map(row => Float32Array.from(row));
    for (let r = 1; r < ROWS-1; r++) {
      for (let c = 1; c < COLS-1; c++) {
        tmp[r][c] = (noise[r][c]*4 + noise[r-1][c] + noise[r+1][c] + noise[r][c-1] + noise[r][c+1]) / 8;
      }
    }
    for (let r = 0; r < ROWS; r++) noise[r].set(tmp[r]);
  }

  map = Array.from({ length: ROWS }, () => new Array(COLS).fill('grass'));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const h = noise[r][c];
      if      (h > 0.85) map[r][c] = 'mountain';
      else if (h > 0.60) map[r][c] = 'forest';
      else if (h > 0.35) map[r][c] = 'grass';
      else if (h > 0.28) map[r][c] = 'sand';
      else               map[r][c] = 'lake';
    }
  }

  const allRiverCells = [];
  const riverTraces = [];
  for (let ri = 0; ri < peaks.length; ri++) {
    let startC = -1, startR = -1, bestD = Infinity;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (map[r][c] !== 'mountain') continue;
        const d = (c - peaks[ri].c)**2 + (r - peaks[ri].r)**2;
        if (d < bestD) { bestD = d; startC = c; startR = r; }
      }
    }
    if (startC === -1) {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (map[r][c] !== 'forest') continue;
          const d = (c - peaks[ri].c)**2 + (r - peaks[ri].r)**2;
          if (d < bestD) { bestD = d; startC = c; startR = r; }
        }
      }
    }
    if (startC === -1) continue;

    let c = startC, r = startR;
    const traceCells = [];

    for (let step = 0; step < 80; step++) {
      if (map[r][c] === 'lake') break;
      map[r][c] = 'river';
      traceCells.push({c, r});
      if (c===0||c===COLS-1||r===0||r===ROWS-1) break;

      let nbrs = hexNeighbors(c,r).filter(n => map[n.row][n.col] !== 'river');
      if (!nbrs.length) break;

      const scores = nbrs.map(n => {
        const riverNbCount = hexNeighbors(n.col, n.row).filter(
          nn => !(nn.col === c && nn.row === r) && map[nn.row][nn.col] === 'river'
        ).length;
        return noise[n.row][n.col] + riverNbCount * 0.4;
      });
      const minScore = Math.min(...scores);
      const temp = 0.08;
      const weights = scores.map(s => Math.exp(-(s - minScore) / temp));
      const totalW = weights.reduce((a, b) => a + b, 0);
      let pick = rng() * totalW;
      let chosen = nbrs[nbrs.length - 1];
      for (let i = 0; i < nbrs.length; i++) {
        pick -= weights[i];
        if (pick <= 0) { chosen = nbrs[i]; break; }
      }
      c = chosen.col; r = chosen.row;
    }
    allRiverCells.push(...traceCells);
    riverTraces.push(traceCells);
  }

  for (const trace of riverTraces) {
    const interior = trace.filter(({c, r}) => c>1 && c<COLS-2 && r>1 && r<ROWS-2 && map[r][c]==='river');
    if (!interior.length) continue;
    const mid = interior[Math.floor(interior.length / 2)];
    map[mid.r][mid.c] = 'bridge';
  }

  for (const z of ZONE_CELLS) map[z.row][z.col] = 'grass';
  map[ZONE_CORE.row][ZONE_CORE.col] = 'grass';
  for (const z of ZONE_CELLS_AROUND) map[z.row][z.col] = 'sand';

  for (let r = 1; r < 4; r++) {
    for (let c = 1; c <= 4; c++) map[r][c] = 'grass';
    for (let c = COLS-2; c >= COLS-5; c--) map[r][c] = 'grass';
  }
}

// ============================================================
//  BALANCE: equalize path length with swamp
// ============================================================
function balanceWithSwamp() {
  function dijkstraPath(start) {
    const dist = new Map();
    const prev = new Map();
    const startKey = `${start.col},${start.row}`;
    dist.set(startKey, 0);
    const queue = [{ col: start.col, row: start.row, cost: 0 }];
    let found = null;

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const cur = queue.shift();
      const curKey = `${cur.col},${cur.row}`;
      if (dist.get(curKey) < cur.cost) continue;
      if (inZone(cur.col, cur.row)) { found = cur; break; }

      for (const nb of hexNeighbors(cur.col, cur.row)) {
        const key = `${nb.col},${nb.row}`;
        const t = TERRAIN[map[nb.row][nb.col]];
        if (!t.passable && !inZone(nb.col, nb.row)) continue;
        if (inZoneCore(nb.col, nb.row)) continue;
        const stepCost = inZone(nb.col, nb.row) ? 1 : t.moveCost;
        const newCost = cur.cost + stepCost;
        if (!dist.has(key) || dist.get(key) > newCost) {
          dist.set(key, newCost);
          prev.set(key, curKey);
          queue.push({ col: nb.col, row: nb.row, cost: newCost });
        }
      }
    }
    if (!found) return [];
    const path = [];
    let node = `${found.col},${found.row}`;
    while (node) {
      const [c,r] = node.split(',');
      path.push({ col:+c, row:+r, cost: dist.get(node) ?? 0 });
      node = prev.get(node);
    }
    return path.reverse();
  }

  function findCavalryPos(side) {
    let found = null, count = 0;
    outer:
    for (let r = 1; r < ROWS; r++) {
      const cols = side === 0 ? [1,2,3,4] : [COLS-2,COLS-3,COLS-4,COLS-5];
      for (const c of cols) {
        if (TERRAIN[map[r][c]].passable) {
          if (count === 3) { found = { col: c, row: r }; break outer; }
          count++;
        }
      }
    }
    return found || (side === 0 ? { col: 2, row: 4 } : { col: COLS-3, row: 4 });
  }

  function findCatapultPos(side) {
    let found = null, count = 0;
    outer:
    for (let r = 1; r < ROWS; r++) {
      const cols = side === 0 ? [1,2,3,4] : [COLS-2,COLS-3,COLS-4,COLS-5];
      for (const c of cols) {
        if (TERRAIN[map[r][c]].passable) {
          if (count === 4) { found = { col: c, row: r }; break outer; }
          count++;
        }
      }
    }
    return found || (side === 0 ? { col: 2, row: 5 } : { col: COLS-3, row: 5 });
  }

  function catapultCanReachZone(start) {
    const visited = new Set([`${start.col},${start.row}`]);
    const queue = [{ col: start.col, row: start.row }];
    while (queue.length) {
      const cur = queue.shift();
      if (inZone(cur.col, cur.row)) return true;
      for (const nb of hexNeighbors(cur.col, cur.row)) {
        const key = `${nb.col},${nb.row}`;
        if (visited.has(key)) continue;
        const t = TERRAIN[map[nb.row][nb.col]];
        if (!t.passable) continue;
        if (map[nb.row][nb.col] === 'mountain') continue;
        if (inZoneCore(nb.col, nb.row)) continue;
        visited.add(key);
        queue.push({ col: nb.col, row: nb.row });
      }
    }
    return false;
  }

  const playerCenter = findCavalryPos(0);
  const aiCenter     = findCavalryPos(1);
  const initialP = dijkstraPath(playerCenter);
  const initialA = dijkstraPath(aiCenter);
  const zoneBlocked = ZONE_CELLS.some(z => !TERRAIN[map[z.row][z.col]].passable);
  const catapultP = catapultCanReachZone(findCatapultPos(0));
  const catapultA = catapultCanReachZone(findCatapultPos(1));
  if (!initialP.length || !initialA.length || zoneBlocked || !catapultP || !catapultA) return false;

  const MAX_ITER = 40;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    const pPath = dijkstraPath(playerCenter);
    const aPath = dijkstraPath(aiCenter);
    const pCost = pPath.length ? pPath[pPath.length-1].cost : Infinity;
    const aCost = aPath.length ? aPath[aPath.length-1].cost : Infinity;
    const diff = pCost - aCost;

    if (Math.abs(diff) <= 1) {
      debugPaths = { player: pPath, ai: aPath };
      break;
    }

    const shorterPath = diff > 0 ? aPath : pPath;
    let placed = false;
    for (let i = 4; i < shorterPath.length - 4; i++) {
      const { col, row } = shorterPath[i];
      const t = map[row][col];
      if (t === 'grass' || t === 'sand' || t === 'forest') {
        map[row][col] = 'swamp';
        placed = true;
        break;
      }
    }
    if (!placed) break;

    if (iter === MAX_ITER - 1) {
      debugPaths = { player: dijkstraPath(playerCenter), ai: dijkstraPath(aiCenter) };
    }
  }
  return true;
}

// ============================================================
//  UNITS
// ============================================================
function createUnit(type, owner, col, row) {
  const d = UNIT_TYPES[type];
  return { id: Math.random(), type, owner, col, row, hp: d.hp, maxHp: d.hp, moved: false, attacked: false, atkBonus: 0 };
}
function unitAt(col, row) { return units.find(u => u.col===col && u.row===row); }
function unitDef(u)        { return UNIT_TYPES[u.type]; }

function placeStartingUnits() {
  units = [];
  const order = ['sword','spear','archer','cavalry','catapult','sword','spear','archer'];

  let placed = 0;
  for (let r = 1; r < ROWS && placed < order.length; r++) {
    for (let c = 1; c <= 4 && placed < order.length; c++) {
      if (TERRAIN[map[r][c]].passable && !unitAt(c,r)) {
        units.push(createUnit(order[placed], 0, c, r));
        placed++;
      }
    }
  }

  placed = 0;
  for (let r = 1; r < ROWS && placed < order.length; r++) {
    for (let c = COLS-2; c >= COLS-5 && placed < order.length; c--) {
      if (TERRAIN[map[r][c]].passable && !unitAt(c,r)) {
        units.push(createUnit(order[placed], 1, c, r));
        placed++;
      }
    }
  }
}

// ============================================================
//  INIT GAME
// ============================================================
function initGame(forceSeed) {
  document.getElementById('msgOverlay').style.display = 'none';
  document.getElementById('logBox').innerHTML = '';
  currentPlayer=0; turnCount=1; gamePhase='select'; aiThinking=false;
  selectedUnit=null; reachableHexes=[]; attackableHexes=[];
  zoneOwner=-1; zoneBalance=0;

  generateMap(forceSeed);
  while (!balanceWithSwamp()) {
    generateMap();
  }
  document.getElementById('seedDisplay').textContent = activeSeed;
  placeStartingUnits();

  const pu = units.filter(u=>u.owner===0);
  if (pu.length) {
    const mid = hexToPixel(pu[Math.floor(pu.length/2)].col, pu[Math.floor(pu.length/2)].row);
    camX = Math.max(-HW, mid.x - (canvas.width-UI_W)/2);
    camY = Math.max(-HEX_SIZE, mid.y - canvas.height/2);
  }

  addLog(t('log_turn_player', 1), 'turn');
  redraw(); updateUI();
}
