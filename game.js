"use strict";

/* ── DevTools を開いたキミへ ──────────────────────────────────
 * よく来たね。ここまで来たなら、もう勝ち方は分かってるはずだ。
 *   state.record = 32   とでも打てば、夢の完全一致だ。
 * 止めはしない。だが、それは「運」じゃなく「上書き」だ。
 * 本物の 1/5.3×10³⁶ を引き当てた者だけが知る感動は、
 * 残念ながらコンソールには流れてこない。
 * ─────────────────────────────────────────────────────────── */
console.log(
  "%cUUIDle%c\nソースをいじろうとしてるそこのキミ。\nズルしても誰も見てないし、誰も褒めてくれない。\nでも……まあ、気持ちよくやってくれ。健闘を祈る。",
  "font-size:20px;font-weight:800;color:#38e8b0;",
  "font-size:13px;color:#8a97b3;line-height:1.6;"
);

const HEX = "0123456789abcdef";
const LEN = 32;
const SEP_AFTER = new Set([7, 11, 15, 19]);
const SAVE_KEY = "uuid_matcher_perfect_v1";
const VARIANT = "89ab";   // RFC 4122 variant nibble
const VER_POS = 12;       // version digit -> '4'
const VAR_POS = 16;       // variant digit -> 8/9/a/b

const UPGRADES = [
  { id: "auto",  name: "オートローラー", base: 50,  growth: 1.28,
    desc: (l) => `自動で毎秒UUIDを生成（現在 ${l} ロール/秒・速度補正前）` },
  { id: "speed", name: "オーバークロック", base: 120, growth: 1.38,
    desc: (l) => `自動ロール速度 +50%/Lv（現在 ×${(1 + 0.5*l).toFixed(2)}）` },
];

function randHex() { return HEX[(Math.random() * 16) | 0]; }
function hexForPos(i) {
  if (i === VER_POS) return "4";
  if (i === VAR_POS) return VARIANT[(Math.random() * 4) | 0];
  return randHex();
}
function randUUID() { return Array.from({length: LEN}, (_, i) => hexForPos(i)); }
function expMatches() {
  let e = 0;
  for (let i = 0; i < LEN; i++) {
    if (i === VER_POS) e += 1;
    else if (i === VAR_POS) e += 1 / 4;
    else e += 1 / 16;
  }
  return e;
}

function newGame() {
  return {
    target: randUUID(),
    candidate: randUUID(),
    bits: 0,
    totalRolls: 0,
    clears: 0,
    record: 0,
    up: { auto: 0, speed: 0 },
    _autoAcc: 0,
  };
}
let state = newGame();

// ---- derived ----
function rollsPerSec() { return state.up.auto * (1 + 0.5 * state.up.speed); }
function matchCount() { let n = 0; for (let i = 0; i < LEN; i++) if (state.candidate[i] === state.target[i]) n++; return n; }
function upCost(def) { return Math.floor(def.base * Math.pow(def.growth, state.up[def.id])); }

// ---- core ----
let overlayShown = false;
function doRoll() {
  let matches = 0;
  for (let i = 0; i < LEN; i++) {
    const c = hexForPos(i);     // pure RNG, valid v4 — no mercy
    state.candidate[i] = c;
    if (c === state.target[i]) matches++;
  }
  state.totalRolls++;
  state.bits += (1 + matches * 1.5);
  if (matches > state.record) {
    state.bits += (matches - state.record) * 25 * (state.clears + 1);
    state.record = matches;
  }
  if (matches === LEN) onComplete();
}

function onComplete() {
  if (overlayShown) return;
  const jackpot = Math.floor(1e6 * (state.clears + 1));
  state.bits += jackpot;
  state.clears += 1;
  overlayShown = true;
  $("mRolls").textContent = fmt(state.totalRolls);
  $("mBits").textContent = fmt(jackpot);
  $("overlay").classList.add("show");
}

function advanceGeneration() {
  state.target = randUUID();
  state.candidate = randUUID();
  state.record = 0;
  overlayShown = false;
  $("overlay").classList.remove("show");
  render(); save();
}

function buyUpgrade(id) {
  const def = UPGRADES.find(x => x.id === id);
  const cost = upCost(def);
  if (state.bits >= cost) { state.bits -= cost; state.up[id]++; render(); save(); }
}

// ---- DOM ----
const $ = (id) => document.getElementById(id);
const elTarget = $("target");
const elCand = $("candidate");
let targetSpans = [], candSpans = [];

function buildBoards() {
  elTarget.innerHTML = ""; elCand.innerHTML = "";
  targetSpans = []; candSpans = [];
  for (let i = 0; i < LEN; i++) {
    const ts = document.createElement("span"); ts.className = "ch";
    elTarget.appendChild(ts); targetSpans.push(ts);
    const cs = document.createElement("span"); cs.className = "ch miss";
    elCand.appendChild(cs); candSpans.push(cs);
    if (SEP_AFTER.has(i)) {
      for (const host of [elTarget, elCand]) {
        const sep = document.createElement("span"); sep.className = "sep"; sep.textContent = "-";
        host.appendChild(sep);
      }
    }
  }
}

function buildShop() {
  const shop = $("shop"); shop.innerHTML = "";
  for (const def of UPGRADES) {
    const card = document.createElement("div"); card.className = "up";
    card.innerHTML = `
      <div class="hd"><span class="name">${def.name}</span><span class="lvl" id="lvl_${def.id}">Lv 0</span></div>
      <div class="desc" id="desc_${def.id}"></div>
      <button id="buy_${def.id}"></button>`;
    shop.appendChild(card);
    $(`buy_${def.id}`).addEventListener("click", () => buyUpgrade(def.id));
  }
}

function render() {
  for (let i = 0; i < LEN; i++) {
    targetSpans[i].textContent = state.target[i];
    const cs = candSpans[i];
    cs.textContent = state.candidate[i];
    const hit = state.candidate[i] === state.target[i];
    if (hit && !cs.classList.contains("match")) { cs.classList.remove("miss"); cs.classList.add("match"); }
    else if (!hit && !cs.classList.contains("miss")) { cs.classList.remove("match"); cs.classList.add("miss"); }
  }

  $("matchN").textContent = matchCount();
  $("recordN").textContent = state.record;
  $("bar").style.width = (state.record / LEN * 100) + "%";

  $("bitsV").textContent = fmt(state.bits);
  $("bpsV").textContent = fmt(estBitsPerSec());
  $("rpsV").textContent = rollsPerSec().toFixed(1);
  $("rollsV").textContent = fmt(state.totalRolls);

  $("genB").textContent = state.clears;

  for (const def of UPGRADES) {
    const cost = upCost(def);
    $(`lvl_${def.id}`).textContent = "Lv " + state.up[def.id];
    $(`desc_${def.id}`).textContent = def.desc(state.up[def.id]);
    const btn = $(`buy_${def.id}`);
    btn.textContent = `購入 — ${fmt(cost)} ビット`;
    btn.disabled = state.bits < cost;
  }

  $("rollBtn").disabled = overlayShown;
}

function estBitsPerSec() {
  const rps = rollsPerSec();
  if (rps <= 0) return 0;
  return rps * (1 + expMatches() * 1.5);
}

function fmt(n) {
  n = Math.floor(n);
  if (n < 1000) return String(n);
  const units = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp"];
  let u = 0;
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
  return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + units[u];
}

// ---- loop ----
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!overlayShown) {
    const rps = rollsPerSec();
    if (rps > 0) {
      state._autoAcc += rps * dt;
      let rolls = Math.floor(state._autoAcc);
      if (rolls > 1000) rolls = 1000;
      state._autoAcc -= rolls;
      for (let r = 0; r < rolls; r++) { doRoll(); if (overlayShown) break; }
    }
  }
  render();
  requestAnimationFrame(loop);
}

// ---- persistence ----
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!s || !Array.isArray(s.target) || s.target.length !== LEN) return false;
    s._autoAcc = 0;
    s.up = Object.assign({ auto: 0, speed: 0 }, s.up || {});
    if (typeof s.clears !== "number") s.clears = 0;
    if (!Array.isArray(s.candidate) || s.candidate.length !== LEN) s.candidate = randUUID();
    state = s;
    return true;
  } catch (e) { return false; }
}

// ---- events ----
$("rollBtn").addEventListener("click", () => { if (!overlayShown) { doRoll(); render(); } });
$("nextBtn").addEventListener("click", advanceGeneration);
$("resetBtn").addEventListener("click", () => {
  if (confirm("進行をすべてリセットします。よろしいですか？")) {
    localStorage.removeItem(SAVE_KEY);
    state = newGame(); overlayShown = false;
    $("overlay").classList.remove("show");
    render();
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.code === "Space" || e.code === "Enter") && !overlayShown) { e.preventDefault(); doRoll(); render(); }
});
setInterval(save, 5000);
window.addEventListener("beforeunload", save);

// ---- boot ----
load();
buildBoards();
buildShop();
render();
requestAnimationFrame(loop);
