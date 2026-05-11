const { Jimp } = require("jimp");
const path = require("path");
const fs = require("fs");

// ─── PERSISTENT GAME DATA ───
// Use process.cwd() for cross-platform compatibility on all hosting servers
const PROJECT_ROOT = process.cwd();
const SAVE_FILE = path.join(PROJECT_ROOT, "data/ludo_games.json");

function loadGames() {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            const raw = fs.readFileSync(SAVE_FILE, "utf8");
            return JSON.parse(raw);
        }
    } catch (e) {
        console.log("⚠️ Ludo: Could not load saved games:", e.message);
    }
    return {};
}

function saveGames() {
    try {
        const dir = path.dirname(SAVE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        // 🧹 GARBAGE COLLECTOR: Remove abandoned games older than 2 hours
        const now = Date.now();
        for (const gId in games) {
            if (now - (games[gId].lastUpdate || now) > 7200000) {
                delete games[gId];
            }
        }

        fs.writeFileSync(SAVE_FILE, JSON.stringify(games, null, 2));
    } catch (e) {
        console.log("⚠️ Ludo: Could not save games:", e.message);
    }
}

// Load from disk on startup, persist in global
if (!global.__LUDO_GAMES__) {
    global.__LUDO_GAMES__ = loadGames();
}
const games = global.__LUDO_GAMES__;

// ─── BOARD CONSTANTS ───
const BOARD_IMG_PATH = path.join(PROJECT_ROOT, "assets/ludo.png");
const ARROW_BOARD_IMG_PATH = path.join(PROJECT_ROOT, "assets/ludoArrow.png");
const BOARD_SIZE = 600;
const CS = 40;

// Path boundaries
const OUTER_END = 50;   // last step on outer ring (steps 0-50 = 51 cells)
const HOME_START = 51;  // first home lane cell
const HOME_END = 55;    // last home lane cell
const FINISH_POS = 56;  // center / finished

// Master clockwise path: 52 cells around the outer ring (grid col, row)
const MASTER_PATH = [
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    [7, 0], [8, 0],
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    [14, 7], [14, 8],
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    [7, 14], [6, 14],
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    [0, 7]
];

const CLASSIC_COLORS = {
    green:  { r: 46, g: 204, b: 71,  hex: 0x2ECC47FF, offset: 1,  home: [[1,7],[2,7],[3,7],[4,7],[5,7]],     base: [[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]],       emoji: "🟢" },
    yellow: { r: 241, g: 196, b: 15, hex: 0xF1C40FFF, offset: 14, home: [[7,1],[7,2],[7,3],[7,4],[7,5]],     base: [[10.5,1.5],[12.5,1.5],[10.5,3.5],[12.5,3.5]],   emoji: "🟡" },
    blue:   { r: 52, g: 152, b: 219, hex: 0x3498DBFF, offset: 27, home: [[13,7],[12,7],[11,7],[10,7],[9,7]], base: [[10.5,10.5],[12.5,10.5],[10.5,12.5],[12.5,12.5]], emoji: "🔵" },
    red:    { r: 231, g: 76, b: 60,  hex: 0xE74C3CFF, offset: 40, home: [[7,13],[7,12],[7,11],[7,10],[7,9]], base: [[1.5,10.5],[3.5,10.5],[1.5,12.5],[3.5,12.5]],   emoji: "🔴" }
};

const ARROW_COLORS = {
    // Up: Blue, Red (Offsets 1, 14)
    blue:   { r: 52, g: 152, b: 219, hex: 0x3498DBFF, offset: 1,  home: [[1,7],[2,7],[3,7],[4,7],[5,7]],     base: [[1.5,1.5],[3.5,1.5],[1.5,3.5],[3.5,3.5]],       emoji: "🔵" },
    red:    { r: 231, g: 76, b: 60,  hex: 0xE74C3CFF, offset: 14, home: [[7,1],[7,2],[7,3],[7,4],[7,5]],     base: [[10.5,1.5],[12.5,1.5],[10.5,3.5],[12.5,3.5]],   emoji: "🔴" },
    // Down: Yellow, Green (Offsets 27, 40)
    yellow: { r: 241, g: 196, b: 15, hex: 0xF1C40FFF, offset: 27, home: [[13,7],[12,7],[11,7],[10,7],[9,7]], base: [[10.5,10.5],[12.5,10.5],[10.5,12.5],[12.5,12.5]], emoji: "🟡" },
    green:  { r: 46, g: 204, b: 71,  hex: 0x2ECC47FF, offset: 40, home: [[7,13],[7,12],[7,11],[7,10],[7,9]], base: [[1.5,10.5],[3.5,10.5],[1.5,12.5],[3.5,12.5]],   emoji: "🟢" }
};

function getColors(mode) {
    return mode === 'arrow' ? ARROW_COLORS : CLASSIC_COLORS;
}

// Safe zones: color start cells + star squares ONLY
const SAFE_ZONES = [1, 9, 14, 22, 27, 35, 40, 48];

// ─── ARROW MODE CONFIGURATION ───
// 1. STRAIGHT ARROWS: works for EVERYONE. Defined as absolute master path indices.
// (Adjust these numbers if the coins do not land exactly on your custom visual arrows!)
const STRAIGHT_ARROWS = [
    [5, 10],   // Green side straight jump
    [18, 23],  // Yellow side straight jump
    [31, 36],  // Blue side straight jump
    [44, 49],  // Red side straight jump
];

// 2. BEND ARROWS: works ONLY for the specific color, pointing directly into their home lane.
// Tail is the relative step before entering home, Head is the relative step inside the home lane.
const BEND_ARROW_TAIL = 47;
const BEND_ARROW_HEAD = 53;

// ─── IMAGE HELPERS ───
let boardImageCache = null;
let arrowBoardImageCache = null;

async function loadBoardImage(mode) {
    if (mode === 'arrow') {
        if (arrowBoardImageCache) return arrowBoardImageCache.clone();
        try {
            arrowBoardImageCache = await Jimp.read(ARROW_BOARD_IMG_PATH);
            arrowBoardImageCache.resize({ w: BOARD_SIZE, h: BOARD_SIZE });
            return arrowBoardImageCache.clone();
        } catch (e) {
            console.log("⚠️ Ludo: Arrow board load failed, falling back:", e.message);
        }
    }
    if (boardImageCache) return boardImageCache.clone();
    try {
        boardImageCache = await Jimp.read(BOARD_IMG_PATH);
        boardImageCache.resize({ w: BOARD_SIZE, h: BOARD_SIZE });
        return boardImageCache.clone();
    } catch (e) {
        console.log("⚠️ Ludo: Board image load failed:", e.message);
        return new Jimp({ width: BOARD_SIZE, height: BOARD_SIZE, color: 0xFFFFFFFF });
    }
}

function drawFilledCircle(img, cx, cy, r, colorObj, borderColor) {
    cx = Math.floor(cx); cy = Math.floor(cy);
    const rSq = r * r;
    const borderR = r - 1;
    const borderSq = borderR * borderR;
    const highlightR = r - 3;
    const highlightSq = highlightR * highlightR;

    for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
            const dist = dx * dx + dy * dy;
            if (dist > rSq) continue;
            const px = cx + dx, py = cy + dy;
            if (px < 0 || px >= BOARD_SIZE || py < 0 || py >= BOARD_SIZE) continue;

            if (dist >= borderSq) {
                // Outer border
                img.setPixelColor(borderColor, px, py);
            } else if (dist >= highlightSq && dist < borderSq) {
                // White highlight ring for 3D effect
                img.setPixelColor(0xFFFFFF99, px, py);
            } else {
                // Gradient: lighter toward top-left, darker toward bottom-right
                const factor = 1.0 - (dist / rSq) * 0.3;
                const lightShift = (dx + dy < 0) ? 30 : -20;
                const cr = Math.min(255, Math.max(0, Math.floor(colorObj.r * factor + lightShift)));
                const cg = Math.min(255, Math.max(0, Math.floor(colorObj.g * factor + lightShift)));
                const cb = Math.min(255, Math.max(0, Math.floor(colorObj.b * factor + lightShift)));
                const hex = ((cr & 0xFF) << 24) | ((cg & 0xFF) << 16) | ((cb & 0xFF) << 8) | 0xFF;
                img.setPixelColor(hex >>> 0, px, py);
            }
        }
    }
}

// Draw a number (1-4) inside a coin using simple pixel art digits
const DIGIT_PATTERNS = {
    1: [[0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], [0, 3], [-1, -2]],
    2: [[-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [2, -2], [2, -1], [1, 0], [0, 0], [-1, 0], [-2, 0], [-2, 1], [-2, 2], [-2, 3], [-1, 3], [0, 3], [1, 3], [2, 3]],
    3: [[-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [2, -2], [2, -1], [1, 0], [0, 0], [2, 1], [2, 2], [2, 3], [1, 3], [0, 3], [-1, 3], [-2, 3]],
    4: [[-2, -3], [-2, -2], [-2, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [2, -3], [2, -2], [2, -1], [2, 1], [2, 2], [2, 3]]
};

function drawDigit(img, cx, cy, num) {
    const pattern = DIGIT_PATTERNS[num];
    if (!pattern) return;
    for (const [dx, dy] of pattern) {
        const px = cx + dx, py = cy + dy;
        if (px >= 0 && px < BOARD_SIZE && py >= 0 && py < BOARD_SIZE) {
            img.setPixelColor(0xFFFFFFFF, px, py);
        }
        // Shadow for visibility
        const sx = px + 1, sy = py + 1;
        if (sx >= 0 && sx < BOARD_SIZE && sy >= 0 && sy < BOARD_SIZE) {
            // Only draw shadow if we haven't drawn a white pixel there
            const existing = img.getPixelColor(sx, sy);
            if (existing !== 0xFFFFFFFF) {
                img.setPixelColor(0x00000088, sx, sy);
            }
        }
    }
}

// ─── RENDER BOARD ───
async function renderBoard(game) {
    const img = await loadBoardImage(game.mode);
    const colors = getColors(game.mode);

    const cellPositions = {};
    for (const player of game.players) {
        player.coins.forEach((step, idx) => {
            let cx, cy;
            if (step === -1) {
                [cx, cy] = colors[player.color].base[idx];
            } else if (step >= 0 && step <= OUTER_END) {
                const pathIdx = (colors[player.color].offset + step) % 52;
                const p = MASTER_PATH[pathIdx];
                cx = p[0] + 0.5;
                cy = p[1] + 0.5;
            } else if (step >= HOME_START && step <= HOME_END) {
                const p = colors[player.color].home[step - HOME_START];
                cx = p[0] + 0.5;
                cy = p[1] + 0.5;
            } else {
                // Finished (FINISH_POS) — center of board
                cx = 7.5;
                cy = 7.5;
            }

            const key = `${cx.toFixed(1)},${cy.toFixed(1)}`;
            if (!cellPositions[key]) cellPositions[key] = [];
            cellPositions[key].push({ color: player.color, num: idx + 1 });
        });
    }

    // Render coins on the board
    for (const key in cellPositions) {
        const coins = cellPositions[key];
        const [cx, cy] = key.split(",").map(Number);

        coins.forEach((c, i) => {
            let ox = 0, oy = 0;
            // Offset coins sharing a cell so they don't overlap
            if (coins.length === 2) {
                ox = (i === 0) ? -7 : 7;
                oy = (i === 0) ? -7 : 7;
            } else if (coins.length === 3) {
                ox = i === 0 ? -8 : i === 1 ? 8 : 0;
                oy = i === 0 ? -5 : i === 1 ? -5 : 8;
            } else if (coins.length >= 4) {
                ox = i % 2 === 0 ? -8 : 8;
                oy = i < 2 ? -8 : 8;
            }

            const px = Math.floor(cx * CS + ox);
            const py = Math.floor(cy * CS + oy);
            const r = coins.length >= 3 ? 9 : 12;

            const col = colors[c.color];
            drawFilledCircle(img, px, py, r, col, 0x000000FF);
            drawDigit(img, px, py, c.num);
        });
    }

    const buffer = await img.getBuffer("image/png");
    return buffer;
}

// ─── GAME LOGIC ───
const RANK_EMOJI = ["🥇", "🥈", "🥉", "4️⃣"];
const RANK_LABEL = ["1st", "2nd", "3rd", "4th"];

function isPlayerFinished(player) {
    return player.coins.every(c => c === FINISH_POS);
}

function isPlayerLeft(player) {
    return player.left === true;
}

function isPlayerOut(player) {
    return isPlayerFinished(player) || isPlayerLeft(player);
}

function advanceTurn(game) {
    game.hasRolled = false;
    game.diceValue = 0;
    // Skip finished AND left players
    let attempts = 0;
    do {
        game.turnIndex = (game.turnIndex + 1) % game.players.length;
        attempts++;
    } while (isPlayerOut(game.players[game.turnIndex]) && attempts < game.players.length);
    saveGames();
}

function isSafe(absPos) {
    return SAFE_ZONES.includes(absPos);
}

function buildLeaderboard(game) {
    const colors = getColors(game.mode);
    const raw = game.finishedOrder || [];
    // Winners first (not left), then players who left — fixes reversed leaderboard
    const winners = raw.filter(p => !p.leftGame);
    const quitters = raw.filter(p => p.leftGame);
    const order = [...winners, ...quitters];
    let text = `\n\n🏆 *FINAL LEADERBOARD* 🏆\n━━━━━━━━━━━━━━\n`;
    for (let i = 0; i < order.length; i++) {
        const p = order[i];
        const label = p.leftGame ? "🚪 Left" : `${RANK_EMOJI[i]} ${RANK_LABEL[i]}`;
        text += `${label} — ${colors[p.color].emoji} @${p.jid.split("@")[0]} (${p.color.toUpperCase()})\n`;
    }
    text += `━━━━━━━━━━━━━━\n🎉 Thanks for playing!\n\n> Azar Tech`;
    return text;
}

async function executeMove(game, coinIndex, sock, from, msg) {
    const colors = getColors(game.mode);
    const currPlayer = game.players[game.turnIndex];
    const dice = game.diceValue;

    const oldPos = currPlayer.coins[coinIndex];
    const newPos = oldPos === -1 ? 0 : oldPos + dice;

    currPlayer.coins[coinIndex] = newPos;

    let captured = false;
    let capturedInfo = [];
    let justFinished = false;
    let arrowTeleport = false;

    if (!game.finishedOrder) game.finishedOrder = [];

    // Check if this player just got all 4 coins home
    if (currPlayer.coins.every(c => c === FINISH_POS)) {
        if (!game.finishedOrder.find(p => p.jid === currPlayer.jid)) {
            game.finishedOrder.push({ jid: currPlayer.jid, color: currPlayer.color });
            justFinished = true;
        }
    }

    // Capture check: only on the main outer path (0 to OUTER_END), NOT on safe zones
    if (newPos >= 0 && newPos <= OUTER_END) {
        const absPos = (colors[currPlayer.color].offset + newPos) % 52;
        if (!isSafe(absPos)) {
            for (const op of game.players) {
                if (op.color === currPlayer.color) continue;
                if (isPlayerOut(op)) continue;
                for (let i = 0; i < 4; i++) {
                    const opPos = op.coins[i];
                    if (opPos >= 0 && opPos <= OUTER_END) {
                        const opAbs = (colors[op.color].offset + opPos) % 52;
                        if (opAbs === absPos) {
                            op.coins[i] = -1;
                            captured = true;
                            capturedInfo.push({ jid: op.jid, color: op.color, coinNum: i + 1 });
                        }
                    }
                }
            }
        }

        // Arrow mode: check if coin landed on an arrow tail
        if (game.mode === 'arrow' && newPos >= 0 && newPos <= OUTER_END) {
            const absPos2 = (colors[currPlayer.color].offset + newPos) % 52;
            
            // 1. Straight Arrows (Works for everyone based on absolute position on the board)
            for (const [tail, head] of STRAIGHT_ARROWS) {
                if (absPos2 === tail) {
                    // Find what relative step this absolute head is for the current player
                    const headStep = (head - colors[currPlayer.color].offset + 52) % 52;
                    if (headStep <= OUTER_END) {
                        currPlayer.coins[coinIndex] = headStep;
                        arrowTeleport = true;
                    }
                    break;
                }
            }

            // 2. Bend Arrows (Only works for the player who owns that home lane)
            if (!arrowTeleport && newPos === BEND_ARROW_TAIL) {
                currPlayer.coins[coinIndex] = BEND_ARROW_HEAD;
                arrowTeleport = true;
            }
        }
    }

    let coinReachedHome = (newPos === FINISH_POS);

    const activePlayers = game.players.filter(p => !isPlayerOut(p));

    // If only 1 (or 0) players left unfinished, end game
    if (activePlayers.length <= 1) {
        for (const ap of activePlayers) {
            if (!game.finishedOrder.find(p => p.jid === ap.jid)) {
                game.finishedOrder.push({ jid: ap.jid, color: ap.color });
            }
        }

        const boardImage = await renderBoard(game);
        const leaderboard = buildLeaderboard(game);
        const mentions = game.players.map(p => p.jid);

        // Auto-delete previous board image
        await deletePreviousBoardMsg(sock, from, game);

        delete games[from];
        saveGames();

        const sent = await sock.sendMessage(from, {
            image: boardImage,
            caption: `🎉 *GAME OVER — ALL POSITIONS DECIDED!*${leaderboard}`,
            mentions
        }, { quoted: msg });
        return sent;
    }

    const boardImage = await renderBoard(game);
    const diceEmoji = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
    let msgText = `${diceEmoji[dice]} Rolled *${dice}*  ·  Moved Coin *${coinIndex + 1}*\n`;

    if (arrowTeleport) {
        msgText += `\n➡️🏹 *ARROW SHORTCUT!* Coin ${coinIndex + 1} teleported forward!`;
        msgText += `\n🔄 Extra turn for arrow!`;
    }

    if (justFinished) {
        const rank = game.finishedOrder.filter(p => !p.leftGame).length;
        msgText += `\n🎉 ${RANK_EMOJI[rank - 1]} @${currPlayer.jid.split("@")[0]} finished in *${RANK_LABEL[rank - 1]} PLACE!*`;
        msgText += `\n🏆 All 4 coins reached home!`;
        if (activePlayers.length > 1) {
            msgText += `\n\n🎮 Game continues for remaining players!`;
        }
    }

    if (captured) {
        for (const ci of capturedInfo) {
            msgText += `\n⚔️ *CAPTURED!* @${ci.jid.split("@")[0]}'s ${colors[ci.color].emoji} Coin ${ci.coinNum} → sent back to base!`;
        }
        msgText += `\n🔄 Extra turn for capturing!`;
    }

    if (coinReachedHome && !justFinished) {
        msgText += `\n🏠 Coin ${coinIndex + 1} reached HOME! Extra turn!`;
    }

    // Extra turn on: 6, capture, coin reached home, or arrow teleport (but NOT if player just finished)
    if ((dice === 6 || captured || coinReachedHome || arrowTeleport) && !justFinished) {
        game.hasRolled = false;
        game.diceValue = 0;
        if (!captured && !coinReachedHome && !arrowTeleport) msgText += `\n🔄 Rolled a 6! Extra turn!`;
        msgText += `\nType \`.ludo roll\` to roll again.`;
    } else {
        advanceTurn(game);
        const nextP = game.players[game.turnIndex];
        msgText += `\n\n➡️ @${nextP.jid.split("@")[0]}'s turn (${colors[nextP.color].emoji} ${nextP.color.toUpperCase()})`;
        msgText += `\nType \`.ludo roll\``;
    }

    saveGames();
    const mentions = game.players.map(p => p.jid);

    // Auto-delete previous board image
    await deletePreviousBoardMsg(sock, from, game);

    const sent = await sock.sendMessage(from, { image: boardImage, caption: msgText, mentions }, { quoted: msg });
    // Track this message for auto-delete next turn
    game.lastBoardMsgKey = sent?.key || null;
    saveGames();
    return sent;
}

// ─── AUTO-DELETE PREVIOUS BOARD IMAGE ───
async function deletePreviousBoardMsg(sock, from, game) {
    try {
        if (game.lastBoardMsgKey) {
            await sock.sendMessage(from, { delete: game.lastBoardMsgKey });
        }
    } catch { }
}

// ─── STATUS TEXT ───
function getStatusText(game) {
    const colors = getColors(game.mode);
    let txt = "";
    for (const p of game.players) {
        const finished = p.coins.filter(c => c === FINISH_POS).length;
        const onBoard = p.coins.filter(c => c >= 0 && c <= HOME_END).length;
        const inBase = p.coins.filter(c => c === -1).length;
        txt += `${colors[p.color].emoji} @${p.jid.split("@")[0]} — 🏠${finished} ✈️${onBoard} 🏰${inBase}\n`;
    }
    return txt;
}

// ─── MAIN COMMAND HANDLER ───
module.exports = async (sock, msg, from, text, args) => {
    const cmd = args[0] ? args[0].toLowerCase() : "";
    const fromId = from;

    // Help menu
    if (!cmd) {
        return sock.sendMessage(from, {
            text:
                `🎲 *AZAHRA LUDO* 🎲\n━━━━━━━━━━━━━━\n\n` +
                `\`.ludo classic\` — Create classic Ludo\n` +
                `\`.ludo arrow\` — Create Arrow mode (shortcuts!)\n` +
                `\`.ludo join <color>\` — Join a color\n` +
                `  Colors: 🔴 red  🟢 green  🟡 yellow  🔵 blue\n` +
                `\`.ludo start\` — Begin the match (2-4 players)\n` +
                `\`.ludo roll\` — Roll the dice 🎲\n` +
                `\`.ludo move <1-4>\` — Move a specific coin\n` +
                `\`.ludo status\` — View current game status\n` +
                `\`.ludo leave\` — Leave mid-game\n` +
                `\`.ludo stop\` — End the game (creator only)\n\n` +
                `💡 *Rules:*\n` +
                `• Roll a 6 to bring a coin out of base\n` +
                `• Rolling 6, capturing, or reaching home = extra turn\n` +
                `• ⭐ Star & color start squares are safe!\n` +
                `• Get all 4 coins to the center to win!\n\n` +
                `🏹 *Arrow Mode:* Land on arrow tail → teleport to head + extra roll!`
        }, { quoted: msg });
    }

    // Bump activity timer for the active game in this chat
    if (games[fromId]) {
        games[fromId].lastUpdate = Date.now();
    }

    // ── CREATE (classic or arrow) ──
    if (cmd === "create" || cmd === "classic" || cmd === "arrow") {
        if (games[fromId]) return sock.sendMessage(from, { text: "⚠️ A game is already active here!\nUse \`.ludo stop\` to end it first." }, { quoted: msg });
        const sender = msg.key.participant || msg.key.remoteJid;
        const mode = cmd === "arrow" ? "arrow" : "classic";
        games[fromId] = {
            status: "waiting",
            creatorJid: sender,
            lastUpdate: Date.now(),
            players: [],
            turnIndex: 0,
            hasRolled: false,
            diceValue: 0,
            finishedOrder: [],
            mode: mode,
            lastBoardMsgKey: null
        };
        saveGames();
        const modeLabel = mode === "arrow" ? "🏹 ARROW MODE" : "🎲 CLASSIC MODE";
        return sock.sendMessage(from, {
            text:
                `🎲 *Ludo Game Created!* (${modeLabel})\n━━━━━━━━━━━━━━\n\n` +
                `Type \`.ludo join <color>\` to join!\n\n` +
                `🔴 \`.ludo join red\`\n` +
                `🟢 \`.ludo join green\`\n` +
                `🟡 \`.ludo join yellow\`\n` +
                `🔵 \`.ludo join blue\`\n\n` +
                (mode === "arrow" ? `🏹 Arrow shortcuts are active! Land on arrows for teleport + extra roll!\n\n` : "") +
                `Need 2-4 players. Type \`.ludo start\` when ready!`
        }, { quoted: msg });
    }

    const game = games[fromId];

    if (!game) {
        return sock.sendMessage(from, { text: "❌ No active Ludo game!\nType \`.ludo create\` to start one." }, { quoted: msg });
    }

    // ── STOP ── (creator only)
    if (cmd === "stop") {
        const sender = msg.key.participant || msg.key.remoteJid;
        if (game.creatorJid && game.creatorJid !== sender) {
            return sock.sendMessage(from, { text: "❌ Only the game creator can stop the game!" }, { quoted: msg });
        }
        delete games[fromId];
        saveGames();
        return sock.sendMessage(from, { text: "🛑 Ludo game stopped and cleared." }, { quoted: msg });
    }

    // ── LEAVE ──
    if (cmd === "leave") {
        const sender = msg.key.participant || msg.key.remoteJid;
        const playerIdx = game.players.findIndex(p => p.jid === sender);
        if (playerIdx === -1) return sock.sendMessage(from, { text: "❌ You're not in this game!" }, { quoted: msg });
        const leavingPlayer = game.players[playerIdx];

        if (isPlayerOut(leavingPlayer)) return sock.sendMessage(from, { text: "❌ You already finished or left!" }, { quoted: msg });

        // Mark as left — remove coins from board
        leavingPlayer.left = true;
        leavingPlayer.coins = [-1, -1, -1, -1];

        // Add to finished order as "left"
        if (!game.finishedOrder) game.finishedOrder = [];
        if (!game.finishedOrder.find(p => p.jid === sender)) {
            game.finishedOrder.push({ jid: sender, color: leavingPlayer.color, leftGame: true });
        }

        // If it was their turn, advance
        if (game.status === "playing" && game.players[game.turnIndex]?.jid === sender) {
            advanceTurn(game);
        }

        // Check if only 1 active player remains → end game
        const activePlayers = game.players.filter(p => !isPlayerOut(p));
        if (game.status === "playing" && activePlayers.length <= 1) {
            for (const ap of activePlayers) {
                if (!game.finishedOrder.find(p => p.jid === ap.jid)) {
                    game.finishedOrder.push({ jid: ap.jid, color: ap.color });
                }
            }
            const leaderboard = buildLeaderboard(game);
            const mentions = game.players.map(p => p.jid);
            delete games[fromId];
            saveGames();
            return sock.sendMessage(from, {
                text: `🚪 @${sender.split("@")[0]} (${COLORS[leavingPlayer.color].emoji}) left the game!\n\n🎉 *GAME OVER — ALL POSITIONS DECIDED!*${leaderboard}`,
                mentions
            }, { quoted: msg });
        }

        saveGames();

        if (game.status === "playing") {
            const colors = getColors(game.mode);
            const nextP = game.players[game.turnIndex];
            return sock.sendMessage(from, {
                text: `🚪 @${sender.split("@")[0]} (${colors[leavingPlayer.color].emoji}) left the game!\nTheir coins have been removed from the board.\n\n➡️ @${nextP.jid.split("@")[0]}'s turn (${colors[nextP.color].emoji})\nType \`.ludo roll\``,
                mentions: game.players.map(p => p.jid)
            }, { quoted: msg });
        }

        // If still in lobby
        game.players.splice(playerIdx, 1);
        saveGames();
        return sock.sendMessage(from, {
            text: `🚪 @${sender.split("@")[0]} left the lobby.\n👥 Players: ${game.players.length}/4`,
            mentions: game.players.map(p => p.jid)
        }, { quoted: msg });
    }

    // ── STATUS ──
    if (cmd === "status") {
        const colors = getColors(game.mode);
        if (game.status === "waiting") {
            const playerList = game.players.length > 0
                ? game.players.map(p => `${colors[p.color].emoji} @${p.jid.split("@")[0]}`).join("\n")
                : "No players yet";
            return sock.sendMessage(from, {
                text: `🎲 *Lobby* (${game.players.length}/4)\n━━━━━━━━━━━━━━\n${playerList}\n\nWaiting for players...`,
                mentions: game.players.map(p => p.jid)
            }, { quoted: msg });
        }
        const currP = game.players[game.turnIndex];
        const statusTxt = getStatusText(game);
        return sock.sendMessage(from, {
            text: `🎲 *Game Status*\n━━━━━━━━━━━━━━\n${statusTxt}\n➡️ Current turn: @${currP.jid.split("@")[0]} (${colors[currP.color].emoji})`,
            mentions: game.players.map(p => p.jid)
        }, { quoted: msg });
    }

    // ── JOIN ──
    if (cmd === "join") {
        const colors = getColors(game.mode);
        if (game.status !== "waiting") return sock.sendMessage(from, { text: "❌ Game already started! Can't join now." }, { quoted: msg });
        const color = args[1]?.toLowerCase();
        if (!colors[color]) return sock.sendMessage(from, { text: "❌ Invalid color!\nUse: \`.ludo join red\`, \`.ludo join green\`, \`.ludo join yellow\`, or \`.ludo join blue\`" }, { quoted: msg });
        if (game.players.find(p => p.color === color)) return sock.sendMessage(from, { text: `❌ ${colors[color].emoji} ${color.toUpperCase()} is already taken!` }, { quoted: msg });

        const sender = msg.key.participant || msg.key.remoteJid;
        if (game.players.find(p => p.jid === sender)) return sock.sendMessage(from, { text: "❌ You already joined!" }, { quoted: msg });
        if (game.players.length >= 4) return sock.sendMessage(from, { text: "❌ Game is full (4/4)!" }, { quoted: msg });

        game.players.push({
            jid: sender,
            color: color,
            coins: [-1, -1, -1, -1]
        });
        saveGames();

        return sock.sendMessage(from, {
            text: `${colors[color].emoji} @${sender.split("@")[0]} joined as *${color.toUpperCase()}*!\n\n👥 Players: ${game.players.length}/4\n${game.players.map(p => `${colors[p.color].emoji} @${p.jid.split("@")[0]}`).join("\n")}\n\n${game.players.length >= 2 ? "✅ Ready! Type \`.ludo start\` to begin!" : "⏳ Need at least 1 more player."}`,
            mentions: game.players.map(p => p.jid)
        }, { quoted: msg });
    }

    // ── START ──
    if (cmd === "start") {
        const colors = getColors(game.mode);
        if (game.status !== "waiting") return sock.sendMessage(from, { text: "❌ Game already started!" }, { quoted: msg });
        if (game.players.length < 2) return sock.sendMessage(from, { text: "❌ Need at least 2 players!\nType \`.ludo join <color>\` to join." }, { quoted: msg });

        game.status = "playing";
        game.turnIndex = 0;
        saveGames();

        const boardImage = await renderBoard(game);
        const currPlayer = game.players[game.turnIndex];
        const playerList = game.players.map(p => `${colors[p.color].emoji} @${p.jid.split("@")[0]}`).join("  ");

        const modeTag = game.mode === 'arrow' ? ' 🏹 ARROW' : '';
        const sent = await sock.sendMessage(from, {
            image: boardImage,
            caption: `🚀 *LUDO${modeTag} GAME STARTED!*\n━━━━━━━━━━━━━━\n\n🎮 ${playerList}\n\n➡️ @${currPlayer.jid.split("@")[0]}'s turn (${colors[currPlayer.color].emoji} ${currPlayer.color.toUpperCase()})\nType \`.ludo roll\` to roll the dice!\n\n💡 Roll a *6* to bring a coin out of base!`,
            mentions: game.players.map(p => p.jid)
        }, { quoted: msg });
        game.lastBoardMsgKey = sent?.key || null;
        saveGames();
        return sent;
    }

    // ── ROLL ──
    if (cmd === "roll") {
        const colors = getColors(game.mode);
        if (game.status !== "playing") return sock.sendMessage(from, { text: "❌ Game hasn't started yet!" }, { quoted: msg });
        const currPlayer = game.players[game.turnIndex];
        const sender = msg.key.participant || msg.key.remoteJid;
        if (currPlayer.jid !== sender) return sock.sendMessage(from, {
            text: `❌ Not your turn!\nIt's @${currPlayer.jid.split("@")[0]}'s turn (${colors[currPlayer.color].emoji}).`,
            mentions: [currPlayer.jid]
        }, { quoted: msg });
        if (game.hasRolled) return sock.sendMessage(from, { text: `🎲 You already rolled *${game.diceValue}*!\nType \`.ludo move <1-4>\` to move a coin.` }, { quoted: msg });

        const dice = Math.floor(Math.random() * 6) + 1;
        game.diceValue = dice;
        game.hasRolled = true;
        saveGames();

        // Find valid moves
        const validMoves = [];
        for (let i = 0; i < 4; i++) {
            const s = currPlayer.coins[i];
            if (s === -1 && dice === 6) validMoves.push(i);
            else if (s >= 0 && s + dice <= FINISH_POS) validMoves.push(i);
        }

        const diceEmoji = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

        if (validMoves.length === 0) {
            advanceTurn(game);
            const nextP = game.players[game.turnIndex];
            return sock.sendMessage(from, {
                text: `${diceEmoji[dice]} You rolled *${dice}* — No valid moves!\n\n➡️ @${nextP.jid.split("@")[0]}'s turn (${colors[nextP.color].emoji} ${nextP.color.toUpperCase()}).`,
                mentions: [nextP.jid]
            }, { quoted: msg });
        }

        // Auto-move if only 1 valid coin
        if (validMoves.length === 1) {
            return executeMove(game, validMoves[0], sock, from, msg);
        }

        // Multiple choices — let player pick
        const moveText = validMoves.map(i => {
            const pos = currPlayer.coins[i];
            const posLabel = pos === -1 ? "🏰 Base" : pos <= OUTER_END ? `📍 Step ${pos}` : `🏠 Home ${pos - OUTER_END}`;
            return `  *${i + 1}* — ${posLabel}`;
        }).join("\n");

        return sock.sendMessage(from, {
            text: `${diceEmoji[dice]} You rolled *${dice}*!\n\n🪙 Which coin to move?\n${moveText}\n\nType \`.ludo move <number>\``
        }, { quoted: msg });
    }

    // ── MOVE ──
    if (cmd === "move") {
        if (game.status !== "playing") return sock.sendMessage(from, { text: "❌ Game hasn't started!" }, { quoted: msg });
        const currPlayer = game.players[game.turnIndex];
        const sender = msg.key.participant || msg.key.remoteJid;
        if (currPlayer.jid !== sender) return sock.sendMessage(from, { text: "❌ Not your turn!" }, { quoted: msg });
        if (!game.hasRolled) return sock.sendMessage(from, { text: "❌ Roll first! Type \`.ludo roll\`" }, { quoted: msg });

        const cNum = parseInt(args[1]);
        if (isNaN(cNum) || cNum < 1 || cNum > 4) return sock.sendMessage(from, { text: "❌ Choose coin 1-4!\nExample: \`.ludo move 2\`" }, { quoted: msg });

        const cIdx = cNum - 1;
        const s = currPlayer.coins[cIdx];
        const dice = game.diceValue;

        let isValid = false;
        if (s === -1 && dice === 6) isValid = true;
        else if (s >= 0 && s + dice <= FINISH_POS) isValid = true;

        if (!isValid) return sock.sendMessage(from, { text: `❌ Coin ${cNum} can't move with a roll of ${dice}!` }, { quoted: msg });

        return executeMove(game, cIdx, sock, from, msg);
    }

    return sock.sendMessage(from, { text: "❓ Unknown sub-command.\nType \`.ludo\` for the full help menu." }, { quoted: msg });
};
