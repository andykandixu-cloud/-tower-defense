"use strict";
// ============================ 游戏状态 ============================
const state = {
  gold: 200,
  lives: 20,
  wave: 0,
  score: 0,
  speed: 1,
  phase: "idle",        // idle | spawning | fighting | over | won
  enemies: [],
  towers: [],           // {gx, gy, x, y, type, level, cd, totalSpent}
  projectiles: [],
  particles: [],
  spawnQueue: [],
  spawnTimer: 0,
  buildChoice: null,    // tower key
  selectedTower: null,
  hover: null,          // {gx, gy, mx, my}
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
