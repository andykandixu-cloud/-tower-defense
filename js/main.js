"use strict";
// ============================ 地图选择 & 主循环 ============================

// 绘制迷你地图预览缩略图（160x130）
function drawMiniMap(canvas, waypoints) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = "#20242e";
  ctx.fillRect(0, 0, w, h);

  // 计算边界缩放
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of waypoints) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const pad = 1;
  const cellW = (maxX - minX + 1 + pad * 2) / w;
  const cellH = (maxY - minY + 1 + pad * 2) / h;
  const scale = Math.min(cellW, cellH);
  const offsetX = (w - (maxX - minX + 1 + pad * 2) * scale) / 2;
  const offsetY = (h - (maxY - minY + 1 + pad * 2) * scale) / 2;
  function toPx(gx, gy) {
    return [
      (gx - minX + pad) * scale + offsetX,
      (gy - minY + pad) * scale + offsetY
    ];
  }

  // 画路径线
  ctx.strokeStyle = "rgba(59,51,39,0.8)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (let i = 0; i < waypoints.length; i++) {
    const [px, py] = toPx(waypoints[i][0], waypoints[i][1]);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // 起点标记（绿色圆点）
  const [sx, sy] = toPx(waypoints[0][0], waypoints[0][1]);
  ctx.fillStyle = "#2ecc71";
  ctx.beginPath(); ctx.arc(sx, sy, 3, 0, Math.PI * 2); ctx.fill();

  // 终点标记（红色城堡位置）
  const [ex, ey] = toPx(waypoints[waypoints.length-1][0], waypoints[waypoints.length-1][1]);
  ctx.fillStyle = "#ff6b6b";
  ctx.beginPath(); ctx.arc(ex, ey, 3, 0, Math.PI * 2); ctx.fill();
}

// ============================ 地图选择器 ============================
function buildMapSelector() {
  const grid = document.getElementById("mapGrid");
  if (!grid) return;

  for (const [key, map] of Object.entries(MAPS)) {
    const card = document.createElement("div");
    card.className = "mapCard";
    card.id = `mapCard_${key}`;

    // 迷你预览 Canvas
    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 160; miniCanvas.height = 130;
    miniCanvas.style.width = "100%";
    drawMiniMap(miniCanvas, map.waypoints);

    card.innerHTML = `
      <div class="mapName">${map.name}</div>
      <div class="mapDesc">${map.desc}</div>
      <div class="mapHint">点击开始 · 点击切换</div>
    `;

    card.onclick = () => selectMap(key);
    card.appendChild(miniCanvas);
    grid.appendChild(card);
  }

  // 默认高亮蛇形地图卡片
  const defaultCard = document.getElementById("mapCard_snake");
  if (defaultCard) defaultCard.classList.add("selected");
}

// 选择地图并启动游戏
function selectMap(key, silent) {
  switchMap(key);
  currentMapKey = key;

  // 更新卡片选中状态
  for (const k of Object.keys(MAPS)) {
    const card = document.getElementById(`mapCard_${k}`);
    if (card) card.classList.toggle("selected", k === key);
  }

  // 如果不是静默模式，启动游戏
  if (!silent && !gameStarted) {
    startGame();
  }
}

let currentMapKey = "snake";
let gameStarted = false;

// 启动游戏：隐藏选择面板，显示游戏界面
function startGame() {
  if (gameStarted) return;
  gameStarted = true;

  const mapSelectPanel = document.getElementById("mapSelectPanel");
  const gameUI = document.getElementById("gameUI");
  const hudMapName = document.getElementById("hudMapName");

  if (mapSelectPanel) mapSelectPanel.style.display = "none";
  if (gameUI) gameUI.style.display = "";
  if (hudMapName) hudMapName.textContent = MAPS[currentMapKey].name;

  // 初始化游戏 UI 元素（按钮、事件监听等）
  initTowerButtons();
  initCanvasClick();
  initContextMenu();
  initKeyHandler();
  initButtons();

  // 启动游戏主循环
  updateUI();
  requestAnimationFrame(loop);
  console.log("🎮 游戏已启动 - 地图:", MAPS[currentMapKey].name);
}

// ============================ 速度控制 ============================
function toggleSpeed() {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  const btn = document.getElementById("speedBtn");
  if (btn) btn.textContent = `⏩ 速度: ${state.speed}x`;
}

// ============================ 主循环 ============================
let last = performance.now();
function loop(now) {
  let dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  for (let i = 0; i < state.speed; i++) update(dt);
  render();
  requestAnimationFrame(loop);
}

// ============================ 鼠标悬停 ============================
canvas.addEventListener("mousemove", e => {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) * (canvas.width / r.width);
  const my = (e.clientY - r.top) * (canvas.height / r.height);
  const gx = Math.floor(mx / CELL), gy = Math.floor(my / CELL);
  state.hover = (gx >= 0 && gx < COLS && gy >= 0 && gy < ROWS) ? { gx, gy, mx, my } : null;
});
canvas.addEventListener("mouseleave", () => state.hover = null);

// ============================ 初始化 ============================
buildMapSelector();
// 等待用户点击地图卡片后通过 startGame() 启动游戏
