// lib/wcgStore.js
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "../data/wcg_leaderboard.json");

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function addScore(number, score) {
  const data = load();
  if (!data[number]) data[number] = { score: 0 };
  data[number].score += score;
  save(data);
}

function getTop(limit = 10) {
  const data = load();
  return Object.entries(data)
    .map(([num, v]) => ({ number: num, score: v.score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { addScore, getTop };
