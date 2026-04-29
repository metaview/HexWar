// ============================================================
//  DRAWING HELPERS
// ============================================================
function drawHex(col, row, fill, stroke) {
  const { x, y } = hexToPixel(col, row);
  const cx = x - camX, cy = y - camY;
  if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) return;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI/180*(60*i - 30);
    const px = cx + HEX_SIZE * Math.cos(a);
    const py = cy + HEX_SIZE * Math.sin(a);
    i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function drawUnit(unit) {
  const { x, y } = hexToPixel(unit.col, unit.row);
  const cx = x - camX, cy = y - camY;
  if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) return;

  const def = unitDef(unit);
  const r = HEX_SIZE * 0.52;
  const dim = unit.moved && unit.attacked;

  ctx.save();
  ctx.globalAlpha = dim ? 0.4 : 1;

  // drop shadow
  ctx.beginPath(); ctx.arc(cx+2, cy+2, r, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();

  // body
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
  const g = ctx.createRadialGradient(cx-3, cy-3, 2, cx, cy, r);
  if (unit.owner===0) { g.addColorStop(0,'#5ab4ff'); g.addColorStop(1,'#1c4f9c'); }
  else                { g.addColorStop(0,'#ff6b6b'); g.addColorStop(1,'#8b1c1c'); }
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = unit.owner===0?'#79c0ff':'#f85149';
  ctx.lineWidth = 1.5; ctx.stroke();

  // symbol
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.round(HEX_SIZE*0.55)}px Arial`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(def.symbol, cx, cy+1);

  // HP bar
  const bw = r*1.6, bh = 3, bx = cx-bw/2, by = cy+r+3;
  ctx.fillStyle = '#21262d'; ctx.fillRect(bx, by, bw, bh);
  const pct = unit.hp / unit.maxHp;
  ctx.fillStyle = pct > 0.5 ? '#3fb950' : pct > 0.25 ? '#d29922' : '#f85149';
  ctx.fillRect(bx, by, bw*pct, bh);

  // rank badge (shield icon, bottom-left)
  const rank = Math.min(5, Math.floor(unit.atkBonus || 0));
  if (rank > 0) drawShieldRank(ctx, cx - r * 0.72, cy + r * 0.55, rank, unit.owner === 0 ? '#79c0ff' : '#f85149');

  ctx.restore();
}

// ============================================================
//  MAIN REDRAW
// ============================================================
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(zoom, zoom);

  // terrain
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      drawHex(c, r, TERRAIN[map[r][c]].color, 'rgba(0,0,0,0.15)');
    }
  }

  // grass vertical dashed line overlays
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'grass') continue;
      const { x, y } = hexToPixel(c, r);
      const cx = x - camX, cy = y - camY;
      if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) continue;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180*(60*i-30);
        ctx.lineTo(cx + HEX_SIZE*Math.cos(a), cy + HEX_SIZE*Math.sin(a));
      }
      ctx.closePath(); ctx.clip();
      ctx.strokeStyle = '#3e7a28';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      const stripeW = 4;
      const left = cx - HEX_SIZE;
      let colIdx = 0;
      for (let sx = left + stripeW; sx < cx + HEX_SIZE; sx += stripeW * 2) {
        ctx.lineDashOffset = (colIdx % 2 === 0) ? 0 : 5;
        ctx.beginPath();
        ctx.moveTo(sx, cy - HEX_SIZE);
        ctx.lineTo(sx, cy + HEX_SIZE);
        ctx.stroke();
        colIdx++;
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
  }

  // sand vertical dashed line overlays
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'sand') continue;
      const { x, y } = hexToPixel(c, r);
      const cx = x - camX, cy = y - camY;
      if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) continue;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180*(60*i-30);
        ctx.lineTo(cx + HEX_SIZE*Math.cos(a), cy + HEX_SIZE*Math.sin(a));
      }
      ctx.closePath(); ctx.clip();
      ctx.strokeStyle = '#9e8a5a';
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 2]);
      const stripeW = 2;
      const left = cx - HEX_SIZE;
      let colIdx = 0;
      for (let sx = left + stripeW; sx < cx + HEX_SIZE; sx += stripeW * 2) {
        ctx.lineDashOffset = (colIdx % 2 === 0) ? 0 : 5;
        ctx.beginPath();
        ctx.moveTo(sx, cy - HEX_SIZE);
        ctx.lineTo(sx, cy + HEX_SIZE);
        ctx.stroke();
        colIdx++;
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
  }

  // forest: stylized pine tree per tile
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'forest') continue;
      const { x, y } = hexToPixel(c, r);
      const cx = x - camX, cy = y - camY;
      if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) continue;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180*(60*i-30);
        ctx.lineTo(cx + HEX_SIZE*Math.cos(a), cy + HEX_SIZE*Math.sin(a));
      }
      ctx.closePath(); ctx.clip();

      const bx = cx, by = cy + HEX_SIZE * 0.35;

      // trunk
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(bx - 2, by - HEX_SIZE * 0.15, 4, HEX_SIZE * 0.28);

      const layers = [
        { w: HEX_SIZE * 0.62, h: HEX_SIZE * 0.38, oy: 0 },
        { w: HEX_SIZE * 0.48, h: HEX_SIZE * 0.34, oy: -HEX_SIZE * 0.22 },
        { w: HEX_SIZE * 0.32, h: HEX_SIZE * 0.28, oy: -HEX_SIZE * 0.40 },
      ];
      layers.forEach(({ w, h, oy }, i) => {
        const ty = by - HEX_SIZE * 0.15 + oy;
        ctx.beginPath();
        ctx.moveTo(bx,     ty - h);
        ctx.lineTo(bx - w, ty);
        ctx.lineTo(bx + w, ty);
        ctx.closePath();
        ctx.fillStyle = i === 0 ? '#1e4010' : i === 1 ? '#255214' : '#2d6318';
        ctx.fill();
        ctx.strokeStyle = '#122a09';
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      ctx.restore();
    }
  }

  // debug: balance paths
  if (showDebugPaths && (debugPaths.player.length || debugPaths.ai.length)) {
    const drawPath = (path, color, labelKey) => {
      const label = t(labelKey);
      path.forEach(({ col, row, cost }) => {
        const { x, y } = hexToPixel(col, row);
        const cx = x - camX, cy = y - camY;
        if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW || cy > canvas.height/zoom+HEX_SIZE) return;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI/180*(60*i-30);
          ctx.lineTo(cx + HEX_SIZE*Math.cos(a), cy + HEX_SIZE*Math.sin(a));
        }
        ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff';
        ctx.font = `bold 9px Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(cost, cx, cy);
        ctx.restore();
      });
      if (path.length) {
        const last = path[path.length-1];
        const { x, y } = hexToPixel(last.col, last.row);
        const cx = x - camX, cy = y - camY;
        ctx.save();
        ctx.fillStyle = color; ctx.globalAlpha = 0.95;
        ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${label}: ${last.cost}`, cx, cy - HEX_SIZE - 4);
        ctx.restore();
      }
    };
    drawPath(debugPaths.player, 'rgba(90,180,255,0.7)',  'debug_player');
    drawPath(debugPaths.ai,     'rgba(255,90,90,0.7)',   'debug_ai');
  }

  // swamp stripe overlays
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'swamp') continue;
      const { x, y } = hexToPixel(c, r);
      const cx = x - camX, cy = y - camY;
      if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) continue;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI/180*(60*i-30);
        ctx.lineTo(cx + HEX_SIZE*Math.cos(a), cy + HEX_SIZE*Math.sin(a));
      }
      ctx.closePath(); ctx.clip();
      ctx.fillStyle = '#4a7a35';
      ctx.fillRect(cx - HEX_SIZE, cy - HEX_SIZE, HEX_SIZE * 2, HEX_SIZE * 2);
      ctx.strokeStyle = '#2a4a1e';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 4]);
      const stripeH = 4;
      const top = cy - HEX_SIZE;
      let lineIdx = 0;
      for (let sy = top + stripeH; sy < cy + HEX_SIZE; sy += stripeH * 2) {
        ctx.lineDashOffset = (lineIdx % 2 === 0) ? 0 : 6;
        ctx.beginPath();
        ctx.moveTo(cx - HEX_SIZE, sy);
        ctx.lineTo(cx + HEX_SIZE, sy);
        ctx.stroke();
        lineIdx++;
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();
    }
  }

  // bridge plank overlays
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (map[r][c] !== 'bridge') continue;
      const { x, y } = hexToPixel(c, r);
      const cx = x - camX, cy = y - camY;
      if (cx < -HW*2 || cy < -HEX_SIZE*2 || cx > (canvas.width-UI_W)/zoom+HW*2 || cy > canvas.height/zoom+HEX_SIZE*2) continue;
      ctx.save();
      ctx.strokeStyle = '#3E2008';
      ctx.lineWidth = 2;
      for (const dy of [-HEX_SIZE*0.28, HEX_SIZE*0.28]) {
        ctx.beginPath();
        ctx.moveTo(cx - HEX_SIZE*0.62, cy + dy);
        ctx.lineTo(cx + HEX_SIZE*0.62, cy + dy);
        ctx.stroke();
      }
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#6B3E10';
      for (let px = -0.5; px <= 0.5; px += 0.25) {
        const bx = cx + px * HEX_SIZE;
        ctx.beginPath();
        ctx.moveTo(bx, cy - HEX_SIZE*0.28);
        ctx.lineTo(bx, cy + HEX_SIZE*0.28);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // control zone overlay
  const zColor  = zoneOwner===0 ? 'rgba(90,180,255,0.38)' : zoneOwner===1 ? 'rgba(255,80,80,0.38)' : 'rgba(255,255,255,0.28)';
  const zStroke = zoneOwner===0 ? '#79c0ff'               : zoneOwner===1 ? '#f85149'               : '#aaaaaa';
  for (const z of ZONE_CELLS) {
    drawHex(z.col, z.row, zColor, null);
    const { x, y } = hexToPixel(z.col, z.row);
    const cx = x - camX, cy = y - camY;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI/180*(60*i-30);
      ctx.lineTo(cx + (HEX_SIZE-1)*Math.cos(a), cy + (HEX_SIZE-1)*Math.sin(a));
    }
    ctx.closePath();
    ctx.strokeStyle = zStroke; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
  }
  // core cell
  {
    const { x, y } = hexToPixel(ZONE_CORE.col, ZONE_CORE.row);
    const cx = x - camX, cy = y - camY;
    drawHex(ZONE_CORE.col, ZONE_CORE.row, 'rgba(30,30,40,0.82)', null);
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI/180*(60*i-30);
      ctx.lineTo(cx + (HEX_SIZE-1)*Math.cos(a), cy + (HEX_SIZE-1)*Math.sin(a));
    }
    ctx.closePath();
    ctx.strokeStyle = zStroke; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = zStroke;
    ctx.font = `bold ${Math.round(HEX_SIZE*0.72)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🏛', cx, cy);
    ctx.restore();
  }

  // highlights
  reachableHexes.forEach(h  => drawHex(h.col,h.row,COLOR_REACHABLE,null));
  attackableHexes.forEach(h => drawHex(h.col,h.row,COLOR_ATTACKABLE,null));
  if (selectedUnit) drawHex(selectedUnit.col,selectedUnit.row,COLOR_SELECTED,null);

  // units
  units.forEach(drawUnit);

  // combat flashes
  const now = Date.now();
  combatFlashes = combatFlashes.filter(f => f.endTime > now);
  combatFlashes.forEach(f => {
    const { x, y } = hexToPixel(f.col, f.row);
    const cx = x - camX, cy = y - camY;
    const age = 1 - (f.endTime - now) / 700;
    const scale = 1 + age * 0.6;
    const alpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(HEX_SIZE * 0.9 * scale)}px Arial`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(f.symbol, cx, cy - HEX_SIZE * 0.55 * scale);
    ctx.restore();
  });
  if (combatFlashes.length > 0) setTimeout(redraw, 30);

  ctx.restore();

  // Selected unit popup (screen coords)
  if (selectedUnit) drawSelectedUnitPopup(selectedUnit);

  // --- minimap ---
  const mm = document.getElementById('minimap');
  const mmW = mm.offsetWidth || 220;
  const mmH = Math.round(mmW * (ROWS * VERT_SPACING) / (HW * (COLS + 0.5)));
  if (mm.width !== mmW || mm.height !== mmH) { mm.width = mmW; mm.height = mmH; }
  const mCtx = mm.getContext('2d');
  const scaleX = mmW / (HW * (COLS + 0.5));
  const scaleY = mmH / (ROWS * VERT_SPACING);
  mCtx.clearRect(0, 0, mmW, mmH);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const { x, y } = hexToPixel(c, r);
      mCtx.fillStyle = TERRAIN[map[r][c]].color;
      mCtx.fillRect(Math.round(x * scaleX), Math.round(y * scaleY),
                    Math.max(1, Math.ceil(HW * scaleX)),
                    Math.max(1, Math.ceil(VERT_SPACING * scaleY * 1.5)));
    }
  }
  units.forEach(u => {
    const { x, y } = hexToPixel(u.col, u.row);
    mCtx.fillStyle = u.owner === 0 ? '#79c0ff' : '#f85149';
    const pr = Math.max(2, Math.round(HW * scaleX * 0.55));
    mCtx.beginPath();
    mCtx.arc(Math.round((x + HW * 0.5) * scaleX), Math.round((y + HEX_SIZE * 0.5) * scaleY), pr, 0, Math.PI * 2);
    mCtx.fill();
  });
  mCtx.strokeStyle = 'rgba(255,255,255,0.75)';
  mCtx.lineWidth = 1.5;
  mCtx.strokeRect(camX * scaleX, camY * scaleY,
                  (canvas.width - UI_W) / zoom * scaleX,
                  canvas.height / zoom * scaleY);
}

// ============================================================
//  SHIELD RANK + POPUP HELPERS
// ============================================================
function drawShieldRank(c, cx, cy, rank, color) {
  const sw = 11, sh = 13;
  c.save();
  c.beginPath();
  c.moveTo(cx - sw/2, cy - sh/2);
  c.lineTo(cx + sw/2, cy - sh/2);
  c.lineTo(cx + sw/2, cy + sh/2 * 0.35);
  c.lineTo(cx,        cy + sh/2);
  c.lineTo(cx - sw/2, cy + sh/2 * 0.35);
  c.closePath();
  c.fillStyle = 'rgba(13,17,23,0.82)';
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = 1.2;
  c.stroke();
  c.strokeStyle = color;
  c.lineWidth = 1.2;
  const innerH = sh * 0.72;
  const step = innerH / (rank + 1);
  for (let i = 1; i <= rank; i++) {
    const sy = cy - sh/2 + step * i;
    const halfW = (sw/2 - 2) * (1 - Math.max(0, (sy - (cy + sh/2*0.35)) / (sh/2 - sh/2*0.35)) * 0.6);
    c.beginPath();
    c.moveTo(cx - halfW, sy);
    c.lineTo(cx + halfW, sy);
    c.stroke();
  }
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x+r, y); c.lineTo(x+w-r, y); c.quadraticCurveTo(x+w,y, x+w,y+r);
  c.lineTo(x+w, y+h-r); c.quadraticCurveTo(x+w,y+h, x+w-r,y+h);
  c.lineTo(x+r, y+h); c.quadraticCurveTo(x,y+h, x,y+h-r);
  c.lineTo(x, y+r); c.quadraticCurveTo(x,y, x+r,y);
  c.closePath();
}

function drawSelectedUnitPopup(unit) {
  const def = unitDef(unit);
  const pad = 12, lh = 19, w = 178;
  const expBonus = Math.floor(unit.atkBonus || 0);
  const rank = Math.min(5, expBonus);
  const rankStr = rank > 0 ? '▰'.repeat(rank) + '▱'.repeat(5 - rank) + `  (+${expBonus})` : '—';
  const rows = [
    { label: def.symbol + '\u2002' + t('unit_' + unit.type), val: '', header: true },
    { label: t('popup_hp'),  val: unit.hp + '\u2009/\u2009' + unit.maxHp },
    { label: t('popup_atk'), val: def.atk + (expBonus > 0 ? ' (+' + expBonus + ')' : '') },
    { label: t('popup_def'), val: def.def },
    { label: t('popup_mov'), val: def.mov },
    { label: t('popup_range'), val: def.range === 1 ? t('popup_melee') : t('popup_tiles', def.range) },
    { label: t('popup_exp'),  val: rankStr },
  ];
  const status = (unit.moved && unit.attacked) ? t('status_done')
               : unit.moved    ? t('status_moved')
               : unit.attacked ? t('status_attacked') : '';
  if (status) rows.push({ label: status, val: '', hint: true });

  const h = pad * 2 + rows.length * lh;
  const margin = 10;

  const { x: ux, y: uy } = hexToPixel(unit.col, unit.row);
  const unitSX = (ux - camX) * zoom;
  const rightEdge = canvas.width - UI_W;
  const onRight = unitSX > rightEdge / 2;
  const tx = onRight ? margin : rightEdge - w - margin;
  const ty = margin;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16;
  ctx.fillStyle = 'rgba(22,27,34,0.97)';
  roundRect(ctx, tx, ty, w, h, 9); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = unit.owner === 0 ? '#388bfd' : '#da3633'; ctx.lineWidth = 2;
  roundRect(ctx, tx, ty, w, h, 9); ctx.stroke();

  const pct = unit.hp / unit.maxHp;
  const bx = tx + pad, bw = w - pad * 2, bh = 5;
  const headerH = pad + lh;
  ctx.fillStyle = '#21262d';
  ctx.fillRect(bx, ty + headerH, bw, bh);
  ctx.fillStyle = pct > 0.5 ? '#3fb950' : pct > 0.25 ? '#d29922' : '#f85149';
  ctx.fillRect(bx, ty + headerH, bw * pct, bh);

  ctx.textBaseline = 'middle';
  let offsetY = 0;
  for (let i = 0; i < rows.length; i++) {
    if (i === 1) offsetY = bh + 3;
    const ly = ty + pad + i * lh + lh / 2 + offsetY;
    if (rows[i].header) {
      ctx.fillStyle = unit.owner === 0 ? '#79c0ff' : '#f85149';
      ctx.font = 'bold 13px Arial'; ctx.textAlign = 'left';
      ctx.fillText(rows[i].label, tx + pad, ly);
    } else if (rows[i].hint) {
      ctx.fillStyle = '#484f58'; ctx.font = 'italic 10px Arial'; ctx.textAlign = 'left';
      ctx.fillText(rows[i].label, tx + pad, ly);
    } else {
      ctx.fillStyle = '#8b949e'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
      ctx.fillText(rows[i].label, tx + pad, ly);
      ctx.fillStyle = '#e6edf3'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'right';
      ctx.fillText(String(rows[i].val), tx + w - pad, ly);
    }
  }
  ctx.restore();
}
