// ============================================================
//  INTERACTION
// ============================================================
function canvasClick(e) {
  if (isDragging || aiThinking || currentPlayer!==0) return;
  const rect = canvas.getBoundingClientRect();
  const { col, row } = pixelToHex((e.clientX - rect.left) / zoom + camX, (e.clientY - rect.top) / zoom + camY);
  if (col<0||col>=COLS||row<0||row>=ROWS) return;

  if (gamePhase==='select') {
    const u = unitAt(col, row);
    if (u && u.owner===0) selectUnit(u);

  } else if (gamePhase==='move') {
    const enemy = units.find(u=>u.owner===1&&u.col===col&&u.row===row);
    const own   = units.find(u=>u.owner===0&&u.col===col&&u.row===row);
    const canAttack = attackableHexes.some(h=>h.col===col&&h.row===row);
    const canMove   = reachableHexes.some(h=>h.col===col&&h.row===row);

    if (own && own===selectedUnit) {
      deselect(); redraw(); updateUI();
    } else if (enemy && canAttack) {
      doCombat(selectedUnit, enemy);
      deselect(); redraw(); updateUI(); checkEndCondition();
    } else if (canMove) {
      selectedUnit.col = col; selectedUnit.row = row; selectedUnit.moved = true;
      reachableHexes = [];
      attackableHexes = getAttackable(selectedUnit);
      if (selectedUnit.attacked || attackableHexes.length===0) { deselect(); }
      else { gamePhase = 'attack'; }
      redraw(); updateUI();
    } else if (own && own!==selectedUnit) {
      selectUnit(own);
    } else {
      deselect(); redraw(); updateUI();
    }

  } else if (gamePhase==='attack') {
    const enemy = units.find(u=>u.owner===1&&u.col===col&&u.row===row);
    const own   = units.find(u=>u.owner===0&&u.col===col&&u.row===row);
    if (own && own===selectedUnit) {
      deselect(); redraw(); updateUI();
    } else if (enemy && attackableHexes.some(h=>h.col===col&&h.row===row)) {
      doCombat(selectedUnit, enemy);
      checkEndCondition();
      deselect(); redraw(); updateUI();
    } else {
      deselect(); redraw(); updateUI();
    }
  }
}

function selectUnit(u) {
  selectedUnit = u;
  gamePhase = u.moved ? 'attack' : 'move';
  reachableHexes  = u.moved    ? [] : getReachable(u);
  attackableHexes = u.attacked ? [] : getAttackable(u);
  redraw(); updateUI();
}

function deselect() {
  selectedUnit = null; reachableHexes = []; attackableHexes = []; gamePhase = 'select';
}

// ============================================================
//  DRAG / SCROLL
// ============================================================
function startDrag(e)  { isDragging = false; dragStart={x:e.clientX,y:e.clientY}; camStart={x:camX,y:camY}; }
function onMouseMove(e) {
  if (!dragStart) return;
  const dx = e.clientX-dragStart.x, dy = e.clientY-dragStart.y;
  if (Math.abs(dx)+Math.abs(dy) > 10) {
    isDragging = true;
    const maxX = Math.max(-HW, HW*(COLS+0.5)-(canvas.width-UI_W)/zoom);
    const maxY = Math.max(-HEX_SIZE, VERT_SPACING*(ROWS-1)+HEX_SIZE*2-canvas.height/zoom);
    camX = Math.max(-HW, Math.min(maxX, camStart.x-dx/zoom));
    camY = Math.max(-HEX_SIZE, Math.min(maxY, camStart.y-dy/zoom));
    redraw();
  }
}
function stopDrag()    { dragStart = null; setTimeout(()=>{ isDragging=false; }, 10); }

// ============================================================
//  UI
// ============================================================
function updateUI() {
  document.getElementById('countPlayer').textContent = units.filter(u=>u.owner===0).length;
  document.getElementById('countAI').textContent     = units.filter(u=>u.owner===1).length;
  document.getElementById('zoneOwnerLabel').textContent  =
    zoneOwner===0 ? t('zone_player') : zoneOwner===1 ? t('zone_ai') : t('zone_neutral');
  const bar = document.getElementById('zoneBalanceBar');
  const pct = zoneBalance / ZONE_WIN_SCORE;
  if (pct === 0) {
    bar.style.left = '50%'; bar.style.width = '0%'; bar.style.background = '#fff';
  } else if (pct > 0) {
    bar.style.left = '50%'; bar.style.width = (pct * 50) + '%'; bar.style.background = '#3fb950';
  } else {
    bar.style.left = (50 + pct * 50) + '%'; bar.style.width = (-pct * 50) + '%'; bar.style.background = '#da3633';
  }
  document.getElementById('zoneBalanceLabel').textContent = (zoneBalance > 0 ? '+' : '') + zoneBalance;

  const badge = document.getElementById('turnBadge');
  badge.textContent = currentPlayer===0 ? t('turn_player', turnCount) : t('turn_ai', turnCount);
  badge.className   = currentPlayer===0 ? 'player' : 'ai';

  const phases = { select: t('phase_select'), move: t('phase_move'), attack: t('phase_attack') };
  document.getElementById('phaseCard').textContent = aiThinking ? t('phase_ai') : (phases[gamePhase]||'');

  document.getElementById('btnEndTurn').disabled = currentPlayer!==0 || aiThinking;
}

const maxLog = 50;
function addLog(msg, type='') {
  const box = document.getElementById('logBox');
  const el  = document.createElement('div');
  if (type) el.className = 'log-'+type;
  el.textContent = msg;
  box.prepend(el);
  while (box.children.length > maxLog) box.removeChild(box.lastChild);
}

function showMessage(title, text) {
  document.getElementById('msgTitle').textContent = title;
  document.getElementById('msgText').textContent  = text;
  document.getElementById('msgOverlay').style.display = 'flex';
}

// ============================================================
//  KEYBOARD
// ============================================================
document.addEventListener('keydown', e => {
  const step = 60;
  const maxX = Math.max(0, HW*(COLS+0.5)-(canvas.width-UI_W));
  const maxY = Math.max(0, VERT_SPACING*(ROWS-1)+HEX_SIZE*2-canvas.height);
  if (e.key==='ArrowLeft')  { camX=Math.max(0,camX-step); redraw(); }
  if (e.key==='ArrowRight') { camX=Math.min(maxX,camX+step); redraw(); }
  if (e.key==='ArrowUp')    { camY=Math.max(0,camY-step); redraw(); }
  if (e.key==='ArrowDown')  { camY=Math.min(maxY,camY+step); redraw(); }
  if (e.key==='Escape')     { deselect(); redraw(); updateUI(); }
});

// ============================================================
//  BOOTSTRAP
// ============================================================
window.addEventListener('load', () => {
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');
  applyI18nHTML();
  document.getElementById('btnLang').addEventListener('click', toggleLang);

  canvas.addEventListener('click',        canvasClick);
  canvas.addEventListener('mousedown',    startDrag);
  canvas.addEventListener('mousemove',    onMouseMove);
  canvas.addEventListener('mouseup',      stopDrag);
  canvas.addEventListener('mouseleave',   stopDrag);
  canvas.addEventListener('contextmenu',  e => { e.preventDefault(); deselect(); redraw(); updateUI(); });

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist = Math.hypot(dx, dy);
      pinchStartZoom = zoom;
      pinchStartCam  = { x: camX, y: camY };
      dragStart = null;
    } else {
      const t = e.touches[0];
      isDragging = false;
      dragStart = { x: t.clientX, y: t.clientY };
      camStart  = { x: camX, y: camY };
      pinchStartDist = null;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchStartDist !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, pinchStartZoom * dist / pinchStartDist));
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const rect  = canvas.getBoundingClientRect();
      const worldX = (midX - rect.left) / zoom + camX;
      const worldY = (midY - rect.top)  / zoom + camY;
      zoom = newZoom;
      camX = worldX - (midX - rect.left) / zoom;
      camY = worldY - (midY - rect.top)  / zoom;
      const maxX = Math.max(-HW, HW*(COLS+0.5)-(canvas.width-UI_W)/zoom);
      const maxY = Math.max(-HEX_SIZE, VERT_SPACING*(ROWS-1)+HEX_SIZE*2-canvas.height/zoom);
      camX = Math.max(-HW, Math.min(maxX, camX));
      camY = Math.max(-HEX_SIZE, Math.min(maxY, camY));
      isDragging = true;
      redraw();
    } else if (dragStart && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = dragStart.x - t.clientX;
      const dy = dragStart.y - t.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 12) {
        isDragging = true;
        const maxX = Math.max(-HW, HW*(COLS+0.5)-(canvas.width-UI_W)/zoom);
        const maxY = Math.max(-HEX_SIZE, VERT_SPACING*(ROWS-1)+HEX_SIZE*2-canvas.height/zoom);
        camX = Math.max(-HW, Math.min(maxX, camStart.x + dx/zoom));
        camY = Math.max(-HEX_SIZE, Math.min(maxY, camStart.y + dy/zoom));
        redraw();
      }
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if (!isDragging && dragStart) {
      const t = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const fake = { clientX: t.clientX, clientY: t.clientY,
                     offsetX: t.clientX - rect.left, offsetY: t.clientY - rect.top };
      canvasClick(fake);
    }
    dragStart = null;
    setTimeout(() => { isDragging = false; }, 10);
  }, { passive: false });

  window.addEventListener('resize', () => { canvas.width=window.innerWidth; canvas.height=window.innerHeight; redraw(); });
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  initGame();
});

document.getElementById('btnEndTurn').addEventListener('click', () => {
  if (currentPlayer!==0||aiThinking) return;
  deselect();
  currentPlayer=1;
  addLog(t('log_turn_ai', turnCount), 'turn');
  updateUI(); redraw();
  setTimeout(doAITurn, 350);
});

document.getElementById('btnToggleDebugPaths').addEventListener('click', () => {
  showDebugPaths = !showDebugPaths;
  redraw();
});

document.getElementById('btnNewGame').addEventListener('click', () => {
  const input = prompt(t('prompt_seed'));
  if (input === null) return;
  const parsed = parseInt(input.trim(), 10);
  initGame(isNaN(parsed) ? undefined : parsed);
});

// Minimap navigation
(function() {
  let mmDragging = false;

  function minimapNav(e) {
    const mm = document.getElementById('minimap');
    const rect = mm.getBoundingClientRect();
    const mmW = mm.width, mmH = mm.height;
    const scaleX = mmW / (HW * (COLS + 0.5));
    const scaleY = mmH / (ROWS * VERT_SPACING);
    const worldX = (e.clientX - rect.left) / (rect.width  / mmW) / scaleX;
    const worldY = (e.clientY - rect.top)  / (rect.height / mmH) / scaleY;
    const vpW = (canvas.width  - UI_W) / zoom;
    const vpH =  canvas.height / zoom;
    const maxX = Math.max(-HW, HW*(COLS+0.5) - vpW);
    const maxY = Math.max(-HEX_SIZE, ROWS*VERT_SPACING - vpH);
    camX = Math.max(-HW, Math.min(maxX, worldX - vpW / 2));
    camY = Math.max(-HEX_SIZE, Math.min(maxY, worldY - vpH / 2));
    redraw();
  }

  const mm = document.getElementById('minimap');
  mm.addEventListener('mousedown', e => {
    mmDragging = true;
    minimapNav(e);
  });
  window.addEventListener('mousemove', e => {
    if (mmDragging) minimapNav(e);
  });
  window.addEventListener('mouseup', () => { mmDragging = false; });

  mm.addEventListener('touchstart', e => {
    e.preventDefault();
    mmDragging = true;
    minimapNav(e.touches[0]);
  }, { passive: false });
  mm.addEventListener('touchmove', e => {
    e.preventDefault();
    if (mmDragging) minimapNav(e.touches[0]);
  }, { passive: false });
  mm.addEventListener('touchend', () => { mmDragging = false; });
})();
