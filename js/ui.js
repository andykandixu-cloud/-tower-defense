"use strict";
// ============================ UI 构建与事件 ============================
// 延迟到 startGame() 时执行，因为在地图选择阶段 #gameUI 被隐藏了。

let recycleMode = false;

// 构建塔选择按钮
function initTowerButtons() {
  const towerBtnWrap = document.getElementById("towerButtons");
  if (!towerBtnWrap) return;
  Object.entries(TOWER_TYPES).forEach(([key, def], i) => {
    const btn = document.createElement("button");
    btn.className = "towerBtn";
    btn.id = "btn_" + key;
    btn.innerHTML = `<span class="icon" style="background:${def.color}"></span>
      <span>${i + 1}. ${def.name}<br><small style="color:#8b93a7">${def.desc}</small></span>
      <span class="cost">$${def.levels[0].cost}</span>`;
    btn.onclick = () => chooseBuild(key);
    towerBtnWrap.appendChild(btn);
  });
}

function chooseBuild(key) {
  if (state.gold < towerCost(key)) { flashMsg(`${TOWER_TYPES[key].name} 需要 ${towerCost(key)} 金币`); return; }
  state.buildChoice = state.buildChoice === key ? null : key;
  state.selectedTower = null;
  updateUI();
}

// 点击事件
function initCanvasClick() {
  canvas.addEventListener("click", e => {
    if (state.phase === "over" || state.phase === "won") return;
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const gx = Math.floor(mx / CELL), gy = Math.floor(my / CELL);

    // 回收模式：点击已有塔 → 直接回收
    if (recycleMode) {
      const tower = towerAt(gx, gy);
      if (tower) { sellTower(tower); return; }
    }
    // 点击已有塔 → 选中
    const tower = towerAt(gx, gy);
    if (tower) { selectTower(tower); return; }

    // 建造模式 → 在空地放置
    if (state.buildChoice && canBuild(gx, gy)) {
      buildTower(gx, gy, state.buildChoice);
      return;
    }

    // 点击空地 → 取消选择
    deselect();
  });
}

// 右键：回收或取消
function initContextMenu() {
  canvas.addEventListener("contextmenu", e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const gx = Math.floor(mx / CELL), gy = Math.floor(my / CELL);
    const tower = towerAt(gx, gy);
    if (tower) { sellTower(tower); return; }
    deselect();
  });
}

// 键盘快捷键
function initKeyHandler() {
  document.addEventListener("keydown", e => {
    const keys = { "1": "arrow", "2": "cannon", "3": "frost" };
    if (keys[e.key]) { chooseBuild(keys[e.key]); return; }
    if (e.key === "Escape") { deselect(); return; }
    if (e.key === " ") { e.preventDefault(); startWave(); return; }
    if (e.key.toLowerCase() === "s") { toggleSpeed(); return; }
    if (e.key.toLowerCase() === "x" && state.selectedTower) { sellTower(state.selectedTower); return; }
  });
}

// 按钮事件
function initButtons() {
  const waveBtn = document.getElementById("waveBtn");
  const speedBtn = document.getElementById("speedBtn");
  const recycleBtn = document.getElementById("recycleModeBtn");
  if (waveBtn) waveBtn.onclick = startWave;
  if (speedBtn) speedBtn.onclick = toggleSpeed;
  if (recycleBtn) {
    recycleBtn.onclick = () => {
      recycleMode = !recycleMode;
      const btn = document.getElementById("recycleModeBtn");
      btn.textContent = recycleMode ? "♻ 回收模式 ON" : "♻ 回收模式";
      btn.style.background = recycleMode ? "#7a3b45" : "#5c4a52";
      deselect();
    };
  }
}

// 更新 UI 面板
function updateUI() {
  const hudGold = document.getElementById("hudGold");
  if (!hudGold) return; // 地图选择阶段跳过
  hudGold.textContent = state.gold;
  document.getElementById("hudLives").textContent = state.lives;
  document.getElementById("hudWave").textContent = state.wave;
  document.getElementById("hudMaxWave").textContent = MAX_WAVE;
  document.getElementById("hudScore").textContent = state.score;

  const waveBtn = document.getElementById("waveBtn");
  const busy = state.spawnQueue.length > 0 || state.enemies.length > 0;
  if (state.wave >= MAX_WAVE && !busy) waveBtn.textContent = "🏆 全部完成";
  else waveBtn.textContent = busy ? `⚔️ 第 ${state.wave} 波进行中…` : `▶ 开始第 ${state.wave + 1} 波`;
  waveBtn.disabled = busy;
  waveBtn.style.opacity = busy ? 0.6 : 1;

  for (const key of Object.keys(TOWER_TYPES)) {
    const btn = document.getElementById("btn_" + key);
    if (btn) {
      btn.classList.toggle("selected", state.buildChoice === key);
      btn.classList.toggle("disabled", state.gold < towerCost(key));
    }
  }
  renderInfo();
}

// 渲染选中塔信息面板
function renderInfo() {
  const el = document.getElementById("towerInfo");
  if (!el) return;
  const t = state.selectedTower;
  if (!t) {
    el.innerHTML = state.buildChoice
      ? `<span class="tips">已选择 ${TOWER_TYPES[state.buildChoice].name}，点击地图上绿色可建造格子放置。</span>`
      : `<span class="tips">点击地图上的塔进行升级/回收（或按 X 快速回收）；右键或 ESC 取消。</span>`;
    return;
  }
  const def = TOWER_TYPES[t.type];
  const cfg = def.levels[t.level];
  const next = def.levels[t.level + 1];
  const refund = sellValue(t);
  let html = `<b style="color:${def.color}">${def.name} Lv.${t.level + 1}</b><br>`;
  html += `伤害 ${cfg.dmg} · 射程 ${cfg.range} · 射速 ${(1 / cfg.rate).toFixed(1)}/秒<br>`;
  if (cfg.splash) html += `溅射半径 ${cfg.splash}px<br>`;
  if (cfg.slow) html += `减速至 ${(cfg.slow * 100)}% 持续 ${cfg.slowDur}s<br>`;
  html += `<button class="actBtn upgradeBtn" onclick="upgradeSel()">${
    next ? `⬆ 升级 (${next.cost}金)` : "★ 已满级"}</button>`;
  html += `<button class="actBtn sellBtn" onclick="sellSel()">♻ 回收 (返还 ${refund}金)</button>`;
  html += `<button class="actBtn sellBtn" onclick="quickSell()" style="background:#5c4a52;margin-top:4px">⚡ 快速回收 (X)</button>`;
  el.innerHTML = html;
}
window.upgradeSel = () => state.selectedTower && upgradeTower(state.selectedTower);
window.sellSel = () => state.selectedTower && sellTower(state.selectedTower);
window.quickSell = () => state.selectedTower && sellTower(state.selectedTower);

// 一键回收全部
function recycleAll() {
  if (state.towers.length === 0) { flashMsg("没有可回收的塔"); return; }
  const totalRefund = state.towers.reduce((sum, t) => sum + sellValue(t), 0);
  if (!confirm(`确定要回收全部 ${state.towers.length} 座塔吗？\n将返还 ${totalRefund} 金币`)) return;
  state.towers.forEach(t => {
    const refund = sellValue(t);
    state.gold += refund;
    spawnParticles(t.x, t.y, "#ff6b6b", 10);
    spawnParticles(t.x, t.y, "#ffd166", 5);
  });
  state.towers = [];
  deselect();
  flashMsg(`♻️ 已回收全部 ${state.towers.length} 座塔，返还 ${totalRefund} 金币`);
  updateUI();
}
window.recycleAll = recycleAll;

// 浮动消息提示
let msgTimer = null;
function flashMsg(text) {
  const el = document.getElementById("towerInfo");
  if (!el) return;
  el.innerHTML = `<span style="color:#4ecdc4">${text}</span>`;
  clearTimeout(msgTimer);
  msgTimer = setTimeout(renderInfo, 1500);
}
