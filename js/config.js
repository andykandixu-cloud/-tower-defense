"use strict";
// ============================ 常量与地图 ============================
const CELL = 40, COLS = 19, ROWS = 15;
const W = COLS * CELL, H = ROWS * CELL;
const MAX_WAVE = 20;
const SELL_REFUND_RATE = 0.7; // 回收返还比例

// ============================ 地图定义 ============================
// 坐标系：19列×15行（每格40px），敌人从左边界进入，到达基地格子即通关

// 默认地图：S型蛇道
let WAYPOINTS = [
  [-1, 2], [14, 2], [14, 6], [4, 6], [4, 10], [17, 10], [17, 13], [10, 13],
];

const MAPS = {
  snake: {
    name: "🏔️ S型蛇道",
    desc: "经典蛇形路线，塔位丰富，适合作战新手入门",
    waypoints: [[-1,2],[14,2],[14,6],[4,6],[4,10],[17,10],[17,13],[10,13]],
  },
  uShape: {
    name: "🏗️ U型回廊",
    desc: "U形弯道围绕中心区，适合冰塔封锁走位",
    waypoints: [[-1,2],[14,2],[14,12],[4,12],[4,8],[17,8],[17,4],[10,4]],
  },
  serpent: {
    name: "🐍 蛇之道",
    desc: "超长蛇形路线贯穿全图，考验长期资源规划",
    waypoints: [[-1,3],[17,3],[17,10],[1,10],[1,7],[17,7],[17,13],[5,13]],
  },
  spiral: {
    name: "🌀 螺旋回廊",
    desc: "绕中心盘旋向内，塔位密集，炮塔发挥巨大威力",
    waypoints: [[-1,7],[16,7],[16,0],[0,0],[0,14],[17,14],[17,3],[11,3]],
  },
  twinRiver: {
    name: "🌊 双河汇流",
    desc: "宽阔蛇形路线，上下两层防线布置空间充足",
    waypoints: [[-1,2],[17,2],[17,5],[1,5],[1,8],[17,8],[17,13],[7,13]],
  },
  lightning: {
    name: "⚡ 闪电突袭",
    desc: "快速直线+对角线穿插，节奏紧凑，箭塔主場",
    waypoints: [[-1,0],[17,0],[17,1],[6,12],[6,12],[17,13],[10,13]],
  },
};

// 选择地图：切换 WAYPOINTS 并重新计算路径
window.switchMap = function(key) {
  const map = MAPS[key];
  if (!map) return;
  WAYPOINTS = map.waypoints.map(w => [...w]);
  pathCells.clear();
  pathCellsAdd(WAYPOINTS);
  recomputePathPixels();
  console.log(`🗺️ 切换到地图: ${map.name}`);
};

// ============================ 路径计算（由 WAYPOINTS 动态生成）============================
const pathCells = new Set();

function pathCellsAdd(wps) {
  let prev = { x: Math.max(0, wps[0][0]), y: wps[0][1] };
  markCell(prev.x, prev.y);
  for (const [wx, wy] of wps.slice(1)) {
    let cx = prev.x, cy = prev.y;
    while (cx !== wx || cy !== wy) {
      if (cx < wx) cx++; else if (cx > wx) cx--;
      else if (cy < wy) cy++; else cy--;
      markCell(cx, cy);
    }
    prev = { x: wx, y: wy };
  }
  function markCell(x, y) {
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) pathCells.add(y * COLS + x);
  }
}
pathCellsAdd(WAYPOINTS);

let PATH_PTS, BASE;

function recomputePathPixels() {
  PATH_PTS = WAYPOINTS.map(([x, y]) => ({ x: (x + 0.5) * CELL, y: (y + 0.5) * CELL }));
  BASE = PATH_PTS[PATH_PTS.length - 1];
}
recomputePathPixels();

// ============================ 塔与敌人定义 ============================
const TOWER_TYPES = {
  arrow: {
    name: "箭塔", color: "#4ecdc4", key: "arrow",
    desc: "高射速单体攻击",
    levels: [
      { cost: 50,  range: 130, dmg: 8,  rate: 0.35, },
      { cost: 60,  range: 150, dmg: 14, rate: 0.30, },
      { cost: 120, range: 175, dmg: 26, rate: 0.22, },
    ],
    projectile: { speed: 480, size: 4, type: "single" },
  },
  cannon: {
    name: "炮塔", color: "#ff8c42", key: "cannon",
    desc: "低射速范围爆炸",
    levels: [
      { cost: 90,  range: 120, dmg: 22, rate: 1.2, splash: 55 },
      { cost: 100, range: 135, dmg: 38, rate: 1.1, splash: 65 },
      { cost: 180, range: 155, dmg: 70, rate: 0.95, splash: 80 },
    ],
    projectile: { speed: 260, size: 7, type: "splash" },
  },
  frost: {
    name: "冰塔", color: "#a78bfa", key: "frost",
    desc: "减速并冰冻敌人",
    levels: [
      { cost: 70,  range: 110, dmg: 4,  rate: 0.6, slow: 0.5, slowDur: 1.5 },
      { cost: 80,  range: 125, dmg: 7,  rate: 0.55, slow: 0.4, slowDur: 2.0 },
      { cost: 150, range: 145, dmg: 12, rate: 0.5, slow: 0.3, slowDur: 2.5 },
    ],
    projectile: { speed: 380, size: 5, type: "slow" },
  },
};

const ENEMY_TYPES = {
  grunt: { name: "小兵", hp: 30,  speed: 60,  reward: 6,  color: "#e74c3c", size: 11 },
  runner:{ name: "疾行者", hp: 22, speed: 110, reward: 8,  color: "#f1c40f", size: 9 },
  tank:  { name: "坦克", hp: 130, speed: 38,  reward: 16, color: "#7f8c8d", size: 14 },
  boss:  { name: "首领", hp: 900, speed: 30,  reward: 100, color: "#c0392b", size: 18 },
};

// 生成第 n 波（1-indexed）敌人列表: [{type, delay, hpMul}]
function makeWave(n) {
  const list = [];
  const hpMul = 1 + (n - 1) * 0.28; // 每波血量成长
  const gruntCount = 6 + n * 2;
  for (let i = 0; i < gruntCount; i++) list.push({ type: "grunt", hpMul, delay: 0.65 });
  if (n >= 3) for (let i = 0; i < Math.floor(n * 1.2); i++) list.push({ type: "runner", hpMul, delay: 0.45 });
  if (n >= 6) for (let i = 0; i < Math.floor((n - 4) / 2) + 1; i++) list.push({ type: "tank", hpMul, delay: 1.2 });
  if (n % 5 === 0) list.push({ type: "boss", hpMul: hpMul * (1 + n / 20), delay: 2 });
  return list;
}
