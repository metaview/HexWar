// ============================================================
//  PATHFINDING (player-facing)
// ============================================================
function getReachable(unit) {
  const def = unitDef(unit);
  const dist = new Map([[ `${unit.col},${unit.row}`, 0 ]]);
  const queue = [{ col: unit.col, row: unit.row, cost: 0 }];

  while (queue.length) {
    queue.sort((a,b) => a.cost-b.cost);
    const cur = queue.shift();
    const curCost = dist.get(`${cur.col},${cur.row}`);
    for (const nb of hexNeighbors(cur.col, cur.row)) {
      const t = TERRAIN[map[nb.row][nb.col]];
      if (!t.passable) continue;
      if (unit.type==='catapult' && map[nb.row][nb.col]==='mountain') continue;
      const occ = unitAt(nb.col, nb.row);
      if (occ && occ.owner !== unit.owner) continue;
      const stepCost = map[nb.row][nb.col] === 'swamp' ? def.mov : t.moveCost;
      const newCost = curCost + stepCost;
      if (newCost > def.mov && curCost > 0) continue;
      const key = `${nb.col},${nb.row}`;
      if (!dist.has(key) || dist.get(key) > newCost) {
        dist.set(key, newCost);
        queue.push({ col: nb.col, row: nb.row, cost: newCost, stepCost });
      }
    }
  }

  return [...dist.keys()]
    .map(k => { const [c,r] = k.split(','); return { col:+c, row:+r }; })
    .filter(h => !(h.col===unit.col && h.row===unit.row) && !unitAt(h.col,h.row) && !inZoneCore(h.col,h.row));
}

function getAttackable(unit) {
  if (inZone(unit.col, unit.row)) return [];
  const def = unitDef(unit);
  return units
    .filter(u => u.owner !== unit.owner && hexDistance(unit.col,unit.row,u.col,u.row) <= def.range)
    .map(u => ({ col:u.col, row:u.row }));
}

// ============================================================
//  COMBAT
// ============================================================
function addCombatFlash(col, row, symbol, duration = 700) {
  combatFlashes.push({ col, row, symbol, endTime: Date.now() + duration });
}

function rollCombatDice(base) {
  const r = rng();
  if (r < 0.10) {
    const val = Math.max(1, Math.round(base * 1.5));
    return { val, note: t('dice_crit') };
  } else if (r < 0.20) {
    const val = Math.max(1, Math.round(base * 0.5));
    return { val, note: t('dice_blocked') };
  } else {
    const val = Math.max(1, base + rngRange(-2, 2));
    return { val, note: '' };
  }
}

function doCombat(attacker, defender) {
  if (!units.includes(attacker) || !units.includes(defender)) return;
  if (inZone(attacker.col, attacker.row)) return;
  const aDef = unitDef(attacker), dDef = unitDef(defender);
  const isRanged = aDef.range > 1;
  const tDef = TERRAIN[map[defender.row][defender.col]];

  const defDef = inZone(defender.col, defender.row) ? Math.floor(dDef.def / 2) : dDef.def;
  const typeBonus = (TYPE_ADVANTAGE[attacker.type] || {})[defender.type] || 0;
  const expAtk = Math.floor(attacker.atkBonus);
  const baseDmg = Math.max(1, aDef.atk + expAtk + typeBonus - defDef - tDef.defBonus);
  const { val: dmg, note: diceNote } = rollCombatDice(baseDmg);
  defender.hp -= dmg;
  attacker.atkBonus += dmg / 10;
  addCombatFlash(defender.col, defender.row, '⚔️');
  const bonusNote = typeBonus > 0 ? ` ⚡+${typeBonus}` : '';
  const expNote = expAtk > 0 ? ` 📈+${expAtk}` : '';
  addLog(t('log_combat', t('unit_'+attacker.type), t('unit_'+defender.type), dmg) + bonusNote + expNote + diceNote + (inZone(defender.col,defender.row) ? t('zone_note') : ''), 'combat');

  if (!isRanged && units.includes(attacker)) {
    const tAtk = TERRAIN[map[attacker.row][attacker.col]];
    const atkDef = inZone(attacker.col, attacker.row) ? Math.floor(aDef.def / 2) : aDef.def;
    const counterBonus = Math.floor(((TYPE_ADVANTAGE[defender.type] || {})[attacker.type] || 0) / 2);
    const baseCdmg = Math.max(1, dDef.atk + counterBonus - atkDef - tAtk.defBonus);
    const { val: cdmg, note: cDiceNote } = rollCombatDice(baseCdmg);
    attacker.hp -= cdmg;
    addCombatFlash(attacker.col, attacker.row, '🛡️');
    const cBonusNote = counterBonus > 0 ? ` ⚡+${counterBonus}` : '';
    addLog(t('log_counter', cdmg) + cBonusNote + cDiceNote, 'combat');
  } else if (isRanged && units.includes(attacker)) {
    const dist = hexDistance(attacker.col, attacker.row, defender.col, defender.row);
    if (dist <= dDef.range) {
      const tAtk = TERRAIN[map[attacker.row][attacker.col]];
      const atkDef = inZone(attacker.col, attacker.row) ? Math.floor(aDef.def / 2) : aDef.def;
      const counterBonus = Math.floor(((TYPE_ADVANTAGE[defender.type] || {})[attacker.type] || 0) / 2);
      const baseCdmg = Math.max(1, dDef.atk + counterBonus - atkDef - tAtk.defBonus);
      const { val: cdmg, note: cDiceNote } = rollCombatDice(baseCdmg);
      attacker.hp -= cdmg;
      addCombatFlash(attacker.col, attacker.row, '🛡️');
      const cBonusNote = counterBonus > 0 ? ` ⚡+${counterBonus}` : '';
      addLog(t('log_counter', cdmg) + cBonusNote + cDiceNote, 'combat');
    }
  }

  if (defender.hp <= 0) { units = units.filter(u=>u!==defender); addLog(t('log_destroyed', t('unit_'+defender.type)), 'death'); }
  if (attacker.hp <= 0) { units = units.filter(u=>u!==attacker); addLog(t('log_destroyed', t('unit_'+attacker.type)), 'death'); }
  if (units.includes(attacker)) { attacker.attacked = true; attacker.moved = true; }
}

// ============================================================
//  PATHFINDING DISTANCE (terrain-aware, ignores units)
// ============================================================
function pathDistance(c1, r1, c2, r2) {
  if (c1===c2 && r1===r2) return 0;
  const distMap = new Map(); distMap.set(`${c1},${r1}`, 0);
  const queue = [{ col:c1, row:r1, d:0 }];
  while (queue.length) {
    queue.sort((a,b)=>a.d-b.d);
    const cur = queue.shift();
    const curD = distMap.get(`${cur.col},${cur.row}`);
    if (cur.col===c2 && cur.row===r2) return curD;
    for (const nb of hexNeighbors(cur.col, cur.row)) {
      const key = `${nb.col},${nb.row}`;
      const t = TERRAIN[map[nb.row][nb.col]];
      if (!t.passable) continue;
      if (inZoneCore(nb.col, nb.row)) continue;
      const cost = map[nb.row][nb.col]==='swamp' ? 10 : t.moveCost < 999 ? t.moveCost : 999;
      const nd = curD + cost;
      if (!distMap.has(key) || distMap.get(key) > nd) {
        distMap.set(key, nd);
        queue.push({ col:nb.col, row:nb.row, d:nd });
      }
    }
  }
  return Infinity;
}

function findPathTo(c1, r1, c2, r2) {
  const prev = new Map();
  const dist = new Map(); dist.set(`${c1},${r1}`, 0);
  const queue = [{ col:c1, row:r1, d:0 }];
  while (queue.length) {
    queue.sort((a,b)=>a.d-b.d);
    const cur = queue.shift();
    const curD = dist.get(`${cur.col},${cur.row}`);
    if (cur.col===c2 && cur.row===r2) break;
    for (const nb of hexNeighbors(cur.col, cur.row)) {
      const key = `${nb.col},${nb.row}`;
      const t = TERRAIN[map[nb.row][nb.col]];
      if (!t.passable) continue;
      if (inZoneCore(nb.col, nb.row)) continue;
      const cost = map[nb.row][nb.col]==='swamp' ? 10 : t.moveCost < 999 ? t.moveCost : 999;
      const nd = curD + cost;
      if (!dist.has(key) || dist.get(key) > nd) {
        dist.set(key, nd); prev.set(key, { col:cur.col, row:cur.row }); queue.push({ col:nb.col, row:nb.row, d:nd });
      }
    }
  }
  const path = [];
  let key = `${c2},${r2}`;
  while (prev.has(key)) {
    const [cc, rr] = key.split(',').map(Number);
    path.unshift({ col:cc, row:rr });
    const p = prev.get(key); key = `${p.col},${p.row}`;
  }
  return path;
}

function centerOnCell(col, row) {
  const { x, y } = hexToPixel(col, row);
  const vpW = (canvas.width - UI_W) / zoom;
  const vpH = canvas.height / zoom;
  const maxX = Math.max(-HW, HW*(COLS+0.5) - vpW);
  const maxY = Math.max(-HEX_SIZE, VERT_SPACING*(ROWS-1)+HEX_SIZE*2 - vpH);
  camX = Math.max(-HW, Math.min(maxX, x - vpW/2));
  camY = Math.max(-HEX_SIZE, Math.min(maxY, y - vpH/2));
}

// ============================================================
//  AI
// ============================================================
function aiScoreAttack(unit, fromCol, fromRow, enemy) {
  const aDef = unitDef(unit), dDef = unitDef(enemy);
  const dist = hexDistance(fromCol, fromRow, enemy.col, enemy.row);
  if (dist > aDef.range) return null;
  if (inZone(fromCol, fromRow)) return null;

  const typeBonus    = (TYPE_ADVANTAGE[unit.type]  || {})[enemy.type]  || 0;
  const counterBonus = Math.floor(((TYPE_ADVANTAGE[enemy.type] || {})[unit.type] || 0) / 2);
  const expAtk       = Math.floor(unit.atkBonus);

  const defStat  = inZone(enemy.col, enemy.row)  ? Math.floor(dDef.def / 2) : dDef.def;
  const myStat   = inZone(fromCol,   fromRow)    ? Math.floor(aDef.def / 2) : aDef.def;
  const tDef     = TERRAIN[map[enemy.row][enemy.col]];
  const tAtk     = TERRAIN[map[fromRow][fromCol]];

  const dmgDealt = Math.max(1, aDef.atk + expAtk + typeBonus - defStat - tDef.defBonus);

  let dmgReceived = 0;
  const canCounter = aDef.range === 1 || dist <= dDef.range;
  if (canCounter) {
    dmgReceived = Math.max(1, dDef.atk + counterBonus - myStat - tAtk.defBonus);
  }

  const killBonus  = dmgDealt    >= enemy.hp ? enemy.hp * 2 : 0;
  const deathMalus = dmgReceived >= unit.hp  ? unit.hp  * 3 : 0;

  const score = dmgDealt + killBonus - dmgReceived * 0.6 - deathMalus;
  return { score, dmgDealt, dmgReceived };
}

function doAITurn() {
  aiThinking = true;
  addLog(t('log_ai_thinking'), 'turn');
  const savedCam = { x: camX, y: camY };
  const aiUnits = units.filter(u => u.owner===1);

  function processUnit(idx) {
    if (idx >= aiUnits.length) {
      setTimeout(() => {
        evaluateZone();
        if (checkEndCondition()) return;
        aiThinking = false;
        currentPlayer = 0;
        turnCount++;
        units.forEach(u => { u.moved = false; u.attacked = false; });
        selectedUnit = null; reachableHexes = []; attackableHexes = [];
        gamePhase = 'select';
        addLog(t('log_turn_player', turnCount), 'turn');
        camX = savedCam.x; camY = savedCam.y;
        redraw(); updateUI();
      }, 300);
      return;
    }

    const unit = aiUnits[idx];
    if (!units.includes(unit)) { processUnit(idx + 1); return; }

    unit.moved = false; unit.attacked = false;
    const enemies = units.filter(u => u.owner === 0);
    if (!enemies.length) { processUnit(idx + 1); return; }

    const def = unitDef(unit);
    const reachable = getReachable(unit);

    const candidates = [{ col: unit.col, row: unit.row }, ...reachable];
    let bestScore = -Infinity, bestDest = null, bestTarget = null;

    for (const pos of candidates) {
      for (const enemy of enemies) {
        const result = aiScoreAttack(unit, pos.col, pos.row, enemy);
        if (result === null) continue;
        if (result.score > bestScore) {
          bestScore  = result.score;
          bestDest   = pos;
          bestTarget = enemy;
        }
      }
    }

    if (bestTarget !== null) {
      const needMove = !(bestDest.col === unit.col && bestDest.row === unit.row);

      function doAttack() {
        if (!inZone(unit.col, unit.row) && units.includes(bestTarget)) {
          centerOnCell(unit.col, unit.row);
          doCombat(unit, bestTarget); redraw(); updateUI(); checkEndCondition();
        } else {
          unit.attacked = true;
        }
        setTimeout(() => processUnit(idx + 1), needMove ? 100 : 600);
      }

      if (needMove) {
        const path = findPathTo(unit.col, unit.row, bestDest.col, bestDest.row);
        let stepIdx = 0;
        function animateStep() {
          if (stepIdx < path.length) {
            unit.col = path[stepIdx].col;
            unit.row = path[stepIdx].row;
            centerOnCell(unit.col, unit.row);
            redraw(); updateUI();
            stepIdx++;
            setTimeout(animateStep, 100);
          } else {
            unit.moved = true;
            doAttack();
          }
        }
        animateStep();
      } else {
        unit.moved = true;
        doAttack();
      }
      return;
    }

    const nearestEnemy = enemies.slice().sort(
      (a, b) => hexDistance(unit.col, unit.row, a.col, a.row) - hexDistance(unit.col, unit.row, b.col, b.row)
    )[0];

    if (!reachable.length) {
      unit.moved = true; unit.attacked = true;
      setTimeout(() => processUnit(idx + 1), 400);
      return;
    }

    const zoneCells     = ZONE_CELLS.filter(z => !unitAt(z.col, z.row));
    const nearEnemyDist = pathDistance(unit.col, unit.row, nearestEnemy.col, nearestEnemy.row);
    const goals = nearEnemyDist > 6 && zoneCells.length
      ? [...zoneCells, { col: nearestEnemy.col, row: nearestEnemy.row }]
      : [{ col: nearestEnemy.col, row: nearestEnemy.row }];

    reachable.sort((a, b) => {
      const bestA = Math.min(...goals.map(g => pathDistance(a.col, a.row, g.col, g.row)));
      const bestB = Math.min(...goals.map(g => pathDistance(b.col, b.row, g.col, g.row)));
      return bestA - bestB;
    });
    const dest = reachable[0];
    const path = findPathTo(unit.col, unit.row, dest.col, dest.row);
    let stepIdx = 0;

    function animateStep() {
      if (stepIdx < path.length) {
        unit.col = path[stepIdx].col;
        unit.row = path[stepIdx].row;
        centerOnCell(unit.col, unit.row);
        redraw(); updateUI();
        stepIdx++;
        setTimeout(animateStep, 100);
      } else {
        unit.moved = true;
        if (!inZone(unit.col, unit.row) && units.includes(nearestEnemy) &&
            hexDistance(unit.col, unit.row, nearestEnemy.col, nearestEnemy.row) <= def.range) {
          doCombat(unit, nearestEnemy); redraw(); updateUI(); checkEndCondition();
        } else {
          unit.attacked = true;
        }
        setTimeout(() => processUnit(idx + 1), 100);
      }
    }
    animateStep();
  }

  processUnit(0);
}

// ============================================================
//  END CONDITION
// ============================================================
function checkEndCondition() {
  const p = units.filter(u=>u.owner===0).length;
  const a = units.filter(u=>u.owner===1).length;
  if (!p || !a) {
    const winner = p ? t('winner_player') : t('winner_ai');
    setTimeout(() => showMessage(p ? t('msg_win_title') : t('msg_lose_title'), t('msg_units_destroyed', winner)), 400);
    return true;
  }
  if (zoneBalance >= ZONE_WIN_SCORE) {
    setTimeout(() => showMessage(t('msg_win_title'), t('msg_zone_player_win', zoneBalance)), 400);
    return true;
  }
  if (zoneBalance <= -ZONE_WIN_SCORE) {
    setTimeout(() => showMessage(t('msg_lose_title'), t('msg_zone_ai_win', zoneBalance)), 400);
    return true;
  }
  return false;
}
