# 🏰 塔防 · Tower Defense

纯前端 HTML5 塔防游戏，零依赖，浏览器直接打开即可游玩。

## 项目结构

```
tower-defense/
├── index.html              # 主入口（多文件版）
├── css/
│   └── style.css           # 全局样式
├── js/
│   ├── config.js           # 地图、塔类型、敌人类型定义
│   ├── state.js            # 游戏状态对象
│   ├── game.js             # 核心玩法逻辑（波次、更新、碰撞）
│   ├── render.js           # Canvas 渲染（地形、塔、敌人、粒子）
│   ├── ui.js               # UI 交互（按钮、面板、信息）
│   └── main.js             # 地图选择器 + 主循环启动
├── dist/
│   └── tower-defense-kards.html   # 单文件分发版（KARDS 美术资源 + CDN 加载）
├── .gitignore              # Git 忽略规则
├── .gitmodules             # KARDS 素材来源说明
└── README.md
```

## 运行方式

### 方法一：本地直接打开（推荐）

双击 `dist/tower-defense-kards.html` 即可在浏览器中打开（需要联网加载图片素材）。

### 方法二：本地 HTTP 服务器

```bash
# 在项目根目录运行
python3 -m http.server 8888
# 然后访问 http://localhost:8888
```

- 多文件开发版 → `http://localhost:8888/index.html`
- 单文件分发版 → `http://localhost:8888/dist/tower-defense-kards.html`

## 游戏特性

| 功能 | 说明 |
|------|------|
| **6 张地图** | S型蛇道 / U型回廊 / 蛇之道 / 螺旋回廊 / 双河汇流 / 闪电突袭 |
| **3 种防御塔** | 箭塔（高射速）、炮塔（范围爆炸）、冰塔（减速冰冻） |
| **3 级升级** | 每种塔可升级到 Lv.2 / Lv.3，提升伤害/射程/特效 |
| **4 种敌人** | 小兵、疾行者、坦克、首领（每 5 波出现） |
| **20 波关卡** | 难度递增，最终 Boss 战 |
| **回收系统** | 右键回收 / X 键快速回收 / 一键回收全部（返还 70% 金币） |

## 快捷键

| 按键 | 功能 |
|------|------|
| `1 / 2 / 3` | 选择箭塔 / 炮塔 / 冰塔 |
| `空格` | 开始下一波 |
| `S` | 切换速度（1x / 2x / 3x） |
| `X` | 快速回收选中的塔 |
| `右键` | 回收或取消选中 |
| `Esc` | 取消选择 |

## KARDS 美术资源

本游戏使用 KARDS（二战卡牌游戏）的公开素材作为视觉主题。

- **原始仓库**: https://github.com/Gary-nope/KARDS-Assets
- **使用方式**: 运行时通过 GitHub CDN 加载，不纳入版本控制
- **素材映射**: 堡垒图→基地、军装肖像→敌人、坦克徽章→炮塔等

## Git 操作

```bash
# 查看提交历史
git log --oneline

# 查看变更
git status
git diff

# 创建新分支开发新功能
git checkout -b feature/new-map
```
