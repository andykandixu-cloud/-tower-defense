"use strict";
// ============================ 逻辑辅助 & 核心玩法 ============================
function towerAt(gx, gy) { return state.towers.find(t => t.gx === gx && t.gy === gy); }
function canBuild(gx, gy) {
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return false;
  if (pathCells.has(gy * COLS + gx)) return false;
  return !towerAt(gx, gy);
}
function towerCost(type, level = 0) { return TOWER_TYPES[type].levels[level].cost; }
function sellValue(t) { return Math.floor(t.totalSpent * SELL_REFUND_RATE); }

function buildTower(gx, gy, type) {
  const cost = towerCost(type, 0);
  if (state.gold < cost) { flashMsg("金币不足！"); return; }
  state.gold -= cost;
  state.towers.push({ gx, gy, type, level: 0, cd: 0, totalSpent: cost,
    x: (gx + 0.5) * CELL, y: (gy + 0.5) * CELL });
  updateUI();
}

function selectTower(t) { state.selectedTower = t; state.buildChoice = null; updateUI(); }
function deselect() { state.selectedTower = null; state.buildChoice = null; updateUI(); }

// 升级
function upgradeTower(t) {
  const def = TOWER_TYPES[t.type];
  if (t.level >= def.levels.length - 1) return;
  const cost = def.levels[t.level + 1].cost;
  if (state.gold < cost) { flashMsg("金币不足！"); return; }
  state.gold -= cost;
  t.level++; t.totalSpent += cost;
  spawnParticles(t.x, t.y, "#ffd166", 12);
  updateUI();
}

// 回收已放置的塔：返还 70% 累计投入金币
function sellTower(t) {
  const refund = sellValue(t);
  state.gold += refund;
  state.towers = state.towers.filter(x => x !== t);
  spawnParticles(t.x, t.y, "#ff6b6b", 10);
  floatText(t.x, t.y - 10, `回收 +${refund}`, "#ffd166");
  deselect();
  flashMsg(`♻️ 已回收 ${TOWER_TYPES[t.type].name}，返还 ${refund} 金币`);
}

function startWave() {
  if (state.phase === "over" || state.phase === "won") return;
  if (state.spawnQueue.length > 0 || state.enemies.length > 0) return;
  if (state.wave >= MAX_WAVE) return;
  state.wave++;
  state.phase = "spawning";
  state.spawnQueue = makeWave(state.wave).map(e => ({ ...e }));
  state.spawnTimer = 0.3;
  updateUI();
}

function spawnEnemy(spec) {
  const base = ENEMY_TYPES[spec.type];
  const hp = Math.round(base.hp * spec.hpMul);
  state.enemies.push({
    type: spec.type, ...base,
    hp, maxHp: hp,
    x: PATH_PTS[0].x, y: PATH_PTS[0].y,
    seg: 1,
    slowMul: 1, slowTimer: 0,
    dead: false,
  });
}

// ============================ 更新循环 ============================
function update(dt) {
  if (state.phase === "over" || state.phase === "won") return;

  // 出怪队列处理
  if (state.spawnQueue.length > 0) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const spec = state.spawnQueue.shift();
      spawnEnemy(spec);
      state.spawnTimer = spec.delay;
    }
  } else if (state.enemies.length === 0 && (state.phase === "spawning" || state.phase === "fighting")) {
    state.phase = "idle";
    if (state.wave >= MAX_WAVE) { win(); return; }
    const bonus = 20 + state.wave * 5;
    state.gold += bonus;
    updateUI();
    flashMsg(`第 ${state.wave} 波清空！奖励 ${bonus} 金币`);
  } else if (state.spawnQueue.length === 0 && state.enemies.length > 0) {
    state.phase = "fighting";
  }

  // 敌人移动
  for (const e of state.enemies) {
    if (e.slowTimer > 0) { e.slowTimer -= dt; if (e.slowTimer <= 0) e.slowMul = 1; }
    let remain = e.speed * e.slowMul * dt;
    while (remain > 0 && e.seg < PATH_PTS.length) {
      const tgt = PATH_PTS[e.seg];
      const dx = tgt.x - e.x, dy = tgt.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= remain) { e.x = tgt.x; e.y = tgt.y; e.seg++; remain -= d; }
      else { e.x += dx / d * remain; e.y += dy / d * remain; remain = 0; }
    }
    if (e.seg >= PATH_PTS.length) {
      e.dead = true;
      state.lives -= (e.type === "boss" ? 5 : 1);
      spawnParticles(BASE.x, BASE.y, "#ff6b6b", 14);
      if (state.lives <= 0) { state.lives = 0; gameOver(); }
      updateUI();
    }
  }

  // 塔攻击判定
  for (const t of state.towers) {
    t.cd -= dt;
    if (t.cd > 0) continue;
    const cfg = TOWER_TYPES[t.type].levels[t.level];
    let best = null, bestScore = -1;
    for (const e of state.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.x - t.x, e.y - t.y);
      if (d <= cfg.range) {
        const score = e.seg * 10000 - d;
        if (score > bestScore) { bestScore = score; best = e; }
      }
    }
    if (best) {
      t.cd = cfg.rate;
      t.angle = Math.atan2(best.y - t.y, best.x - t.x);
      state.projectiles.push({
        x: t.x, y: t.y, target: best, tower: t.type,
        speed: TOWER_TYPES[t.type].projectile.speed,
        size: TOWER_TYPES[t.type].projectile.size,
        dmg: cfg.dmg, cfg,
      });
    }
  }

  // 弹道追踪
  for (const p of state.projectiles) {
    const tgt = p.target;
    if (tgt.dead) { p.done = true; continue; }
    const dx = tgt.x - p.x, dy = tgt.y - p.y;
    const d = Math.hypot(dx, dy);
    const step = p.speed * dt;
    if (d <= step + tgt.size) {
      p.done = true;
      hitEnemy(tgt, p);
    } else {
      p.x += dx / d * step; p.y += dy / d * step;
    }
  }
  state.projectiles = state.projectiles.filter(p => !p.done);

  // 清理死亡单位
  state.enemies = state.enemies.filter(e => !e.dead);

  // 粒子更新
  for (const pt of state.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.life -= dt;
  }
  state.particles = state.particles.filter(p => p.life > 0);
}

function hitEnemy(e, p) {
  const cfg = p.cfg;
  if (cfg.splash) {
    spawnParticles(e.x, e.y, "#ff8c42", 10);
    for (const other of state.enemies) {
      if (other.dead) continue;
      const d = Math.hypot(other.x - e.x, other.y - e.y);
      if (d <= cfg.splash) {
        const falloff = 1 - (d / cfg.splash) * 0.5;
        damage(other, Math.round(cfg.dmg * falloff), p);
      }
    }
  } else {
    if (cfg.slow) {
      e.slowMul = cfg.slow;
      e.slowTimer = cfg.slowDur;
      spawnParticles(e.x, e.y, "#a78bfa", 5);
    }
    damage(e, cfg.dmg, p);
  }
}

function damage(e, dmg, p) {
  if (e.dead) return;
  e.hp -= dmg;
  if (e.hp <= 0) {
    e.dead = true;
    state.gold += e.reward;
    state.score += e.reward * 10;
    spawnParticles(e.x, e.y, e.color, 8);
    floatText(e.x, e.y, `+${e.reward}`, "#ffd166");
    updateUI();
  }
}

function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 80;
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.4 + Math.random() * 0.3, maxLife: 0.6, color, size: 2 + Math.random() * 2 });
  }
}
function floatText(x, y, text, color) {
  state.particles.push({ x, y, vx: 0, vy: -40, life: 0.8, maxLife: 0.8, color, text });
}

function gameOver() {
  state.phase = "over";
  showEnd("💀 基地陷落", `坚持到第 ${state.wave} 波 · 得分 ${state.score}`);
}
function win() {
  state.phase = "won";
  showEnd("🏆 胜利！", `你守住了全部 ${MAX_WAVE} 波进攻！得分 ${state.score}`);
}
function showEnd(title, text) {
  document.getElementById("msgTitle").textContent = title;
  document.getElementById("msgText").textContent = text;
  document.getElementById("msg").style.display = "block";
}
