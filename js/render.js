"use strict";
// ============================ 渲染 ============================
function render() {
  ctx.clearRect(0, 0, W, H);

  // 草地网格
  for (let gy = 0; gy < ROWS; gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      const onPath = pathCells.has(gy * COLS + gx);
      ctx.fillStyle = onPath ? "#3b3327" : ((gx + gy) % 2 ? "#252a36" : "#232834");
      ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
      if (onPath) {
        ctx.fillStyle = "#463c2c";
        ctx.fillRect(gx * CELL + 2, gy * CELL + 2, CELL - 4, CELL - 4);
      }
    }
  }

  // 出生点与基地
  ctx.fillStyle = "#2ecc71";
  const sp = PATH_PTS[0];
  ctx.fillRect(0, sp.y - 16, 8, 32);
  ctx.font = "20px serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("🏰", BASE.x, BASE.y);
  ctx.strokeStyle = "#ff6b6b";
  ctx.lineWidth = 2;
  ctx.strokeRect(BASE.x - 16, BASE.y - 16, 32, 32);

  // 悬停格子（建造预览）
  if (state.hover && state.buildChoice) {
    const { gx, gy } = state.hover;
    const ok = canBuild(gx, gy) && state.gold >= towerCost(state.buildChoice);
    const def = TOWER_TYPES[state.buildChoice];
    const range = def.levels[0].range;
    ctx.fillStyle = ok ? "rgba(78,205,196,0.25)" : "rgba(231,76,60,0.25)";
    ctx.fillRect(gx * CELL, gy * CELL, CELL, CELL);
    if (ok) {
      ctx.strokeStyle = "rgba(78,205,196,0.5)";
      ctx.beginPath();
      ctx.arc((gx + 0.5) * CELL, (gy + 0.5) * CELL, range, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 塔
  for (const t of state.towers) {
    const def = TOWER_TYPES[t.type];
    const sel = state.selectedTower === t;
    if (sel) {
      const cfg = def.levels[t.level];
      ctx.strokeStyle = "rgba(255,209,102,0.5)";
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(t.x, t.y, cfg.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // 回收按钮（右上角）
      const bx = t.gx * CELL + CELL - 14, by = t.gy * CELL + 6;
      ctx.fillStyle = "rgba(122,59,69,0.95)";
      ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffc9c9";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("♻", bx, by);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      // 回收价格标签
      const refund = Math.floor(t.totalSpent * SELL_REFUND_RATE);
      ctx.fillStyle = "rgba(255,209,102,0.9)";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`+$${refund}`, t.x, t.y - 22);
      ctx.textAlign = "left";
    }
    // 底座
    ctx.fillStyle = "#2b3040";
    ctx.fillRect(t.gx * CELL + 4, t.gy * CELL + 4, CELL - 8, CELL - 8);
    // 炮塔
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 12, 0, Math.PI * 2);
    ctx.fill();
    // 炮管方向
    if (t.angle !== undefined) {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = t.type === "cannon" ? 6 : 3;
      ctx.beginPath();
      ctx.moveTo(t.x, t.y);
      ctx.lineTo(t.x + Math.cos(t.angle) * 16, t.y + Math.sin(t.angle) * 16);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    // 等级星
    ctx.fillStyle = "#ffd166";
    for (let i = 0; i <= t.level; i++) {
      ctx.beginPath();
      ctx.arc(t.gx * CELL + 8 + i * 7, t.gy * CELL + CELL - 7, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // 回收价格标签（未选中时也显示）
    if (!sel) {
      const refund = Math.floor(t.totalSpent * SELL_REFUND_RATE);
      ctx.fillStyle = "rgba(255,209,102,0.7)";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`♻+$${refund}`, t.x, t.y + 18);
      ctx.textAlign = "left";
    }
  }

  // 敌人
  for (const e of state.enemies) {
    if (e.slowTimer > 0) {
      ctx.fillStyle = "rgba(167,139,250,0.3)";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.size + 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.stroke();
    if (e.type === "boss") {
      ctx.fillStyle = "#ffd166";
      ctx.font = "14px serif";
      ctx.fillText("👑", e.x, e.y - e.size - 6);
    }
    // 血条
    const bw = e.size * 2.2, ratio = e.hp / e.maxHp;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(e.x - bw / 2, e.y - e.size - 9, bw, 4);
    ctx.fillStyle = ratio > 0.5 ? "#2ecc71" : ratio > 0.25 ? "#f1c40f" : "#e74c3c";
    ctx.fillRect(e.x - bw / 2, e.y - e.size - 9, bw * ratio, 4);
  }

  // 弹道
  for (const p of state.projectiles) {
    ctx.fillStyle = TOWER_TYPES[p.tower].color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // 粒子
  for (const pt of state.particles) {
    const alpha = Math.max(pt.life / pt.maxLife, 0);
    ctx.globalAlpha = alpha;
    if (pt.text) {
      ctx.fillStyle = pt.color;
      ctx.font = "bold 14px sans-serif";
      ctx.fillText(pt.text, pt.x, pt.y);
    } else {
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
