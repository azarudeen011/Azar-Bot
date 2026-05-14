const m = require("../lib/mafiaEngine");

module.exports = async (sock, msg, from, text, args = []) => {

const sender =
msg.key.fromMe
? sock.user.id
: (msg.key.participant || msg.key.remoteJid);

const cmd = args[0]?.toLowerCase();
const isGroup = from.endsWith("@g.us");

// 🧹 RAM GARBAGE COLLECTOR: Clean abandoned or STUCK mafia lobbies
for (const gid in m.games) {
    const g = m.games[gid];
    const now = Date.now();
    // Lobby stuck for 30m OR Active game stuck for 15m
    const isLobbyStuck = g.phase === "lobby" && now - (g.created || 0) > 1800000;
    const isGameStuck = g.phase !== "lobby" && now - (g.lastActivity || 0) > 900000;

    if (isLobbyStuck || isGameStuck) {
        m.endGame(gid); 
    }
}

// ================= HELP =================
if(!cmd){

return sock.sendMessage(from,{
text:
`🎭 *MAFIA GAME*

.mafia start
.mafia join
.mafia leave
.mafia begin

🌙 Night (DM)
.mafia kill <num>
.mafia save <num>
.mafia say text

☀️ Day
.mafia vote <num>

Owner cannot play

*RULES*
- Minimum 4 players
- Mafia kills at night
- Doctor saves at night
- Don't screenshot your role in group
- Each Mafia can kill 2 per night
- Doctor can save 1 per night
- play anonymously and win`
},{quoted:msg});

}

// ================= START =================
if(cmd==="start"){

if(!isGroup) return;

const r = m.create(from);

return sock.sendMessage(from,{
text: r.ok
? "🎭 *Mafia Lobby Opened!*\n\nType *.mafia join* to join game\n\n*Rules*\n- Minimum 4 players\n- Don't screenshot your role in group\n- Mafia kills at night\n- Doctor saves at night"
: r.msg
},{quoted:msg});

}

// ================= JOIN =================
if(cmd==="join"){

if(!isGroup) return;

const r = m.join(from, sender, msg.pushName || "Player");

return sock.sendMessage(from,{
text: r.ok
? `✅ Joined Mafia Game as Player ${r.num}`
: r.msg
},{quoted:msg});

}

// ================= LEAVE =================
if(cmd==="leave"){

const r = m.leave(sender);

return sock.sendMessage(from,{
text: r.ok
? "🚪 You left the Mafia game"
: "❌ You are not in game"
},{quoted:msg});

}

// ================= BEGIN =================
if(cmd==="begin"){

if(!isGroup) return;

const r = m.start(from);

if(!r.ok)
return sock.sendMessage(from,{text:r.msg},{quoted:msg});

const g = m.games[from];

let list = "🎭 *Mafia Game Started*\n\n";
let mentions = [];

g.players.forEach(p=>{
list += `${p.num}. @${p.jid.split("@")[0]}\n`;
mentions.push(p.jid);
});

await sock.sendMessage(from,{
text: list + "\n🌙 Night begins...",
mentions
});

// ===== Send Roles in DM =====
for(const p of g.players){

let role = "👤 Civilian";

if(p.role==="mafia")
role = "🔪 Mafia\nUse .mafia kill <num>\nUse .mafia say text";

if(p.role==="doctor")
role = "💉 Doctor\nUse .mafia save <num>";

await sock.sendMessage(
p.jid,
{
text:
`🎭 *Your Secret Role*\n\n${role}\n\nPlayer Number: ${p.num}`
}
).catch(()=>{});

}

gameLoop(sock,from);

}

// ================= KILL =================
if(cmd==="kill" && !isGroup){

const r = m.kill(sender,args[1]);

return sock.sendMessage(from,{text:r.msg},{quoted:msg});

}

// ================= SAVE =================
if(cmd==="save" && !isGroup){

const r = m.save(sender,args[1]);

return sock.sendMessage(from,{text:r.msg},{quoted:msg});

}

// ================= TEAM CHAT =================
if(cmd==="say" && !isGroup){

await m.mafiaSay(sock,sender,args.slice(1).join(" "));

}

// ================= VOTE =================
if(cmd==="vote" && isGroup){

const r = m.vote(sender,args[1]);

return sock.sendMessage(from,{text:r.msg},{quoted:msg});

}

// ================= END GAME =================
if(cmd==="end"){
    const { isSudo } = require("../lib/guards");
    if (!(await isSudo(sock, msg))) {
        return sock.sendMessage(from, { text: "❌ Only owner or sudo can end the game." }, { quoted: msg });
    }
    m.endGame(from);
    return sock.sendMessage(from, { text: "🛑 Mafia game has been force-ended." }, { quoted: msg });
}

};



// ================= GAME LOOP =================
async function gameLoop(sock, gid) {
    const g = m.games[gid];
    if (!g) return;

    // Helper to ensure next step is scheduled even if messaging fails
    const scheduleNext = (nextFn, delay) => {
        setTimeout(async () => {
            if (!m.games[gid]) return;
            try {
                await nextFn();
            } catch (err) {
                console.error("Mafia Phase Error:", err);
                // Try to recover by skipping to next night if possible
                if (m.games[gid] && m.games[gid].phase !== "night") {
                    m.games[gid].phase = "night";
                    gameLoop(sock, gid);
                }
            }
        }, delay);
    };

    // --- PHASE 1: RESOLVE NIGHT ---
    scheduleNext(async () => {
        const deaths = m.resolveNight(g);
        let text = "";
        let mentions = [];

        if (!deaths.length) {
            text = "🌙 *Quiet Night...*\nNo one was killed tonight.\n\n☀️ *Discussion Time Begins!*";
        } else {
            text = "💀 *NIGHT BLOODBATH*\n\n";
            for (const d of deaths) {
                const role = d.role.toUpperCase();
                text += `☠️ @${d.jid.split("@")[0]} was found dead — (${role})\n`;
                mentions.push(d.jid);
            }
            text += "\n☀️ *Discussion Time Begins!*";
        }

        await sock.sendMessage(gid, { text, mentions }).catch(e => console.log("Mafia MSG Err:", e.message));

        // --- PHASE 2: DISCUSSION -> VOTE START ---
        scheduleNext(async () => {
            g.phase = "vote";
            g.lastActivity = Date.now();
            await sock.sendMessage(gid, { text: "🗳️ *VOTING OPENED!*\nUse `.mafia vote <num>` to eliminate someone." }).catch(() => {});

            // --- PHASE 3: RESOLVE VOTE ---
            scheduleNext(async () => {
                const v = m.resolveVote(g);
                if (v.tie) {
                    await sock.sendMessage(gid, { text: "⚖️ *VOTING TIE*\nThe town couldn't reach a decision. Nobody was eliminated." }).catch(() => {});
                } else {
                    const role = v.role.toUpperCase();
                    const icon = v.role === "mafia" ? "🔪" : (v.role === "doctor" ? "💉" : "👤");
                    await sock.sendMessage(gid, {
                        text: `🚫 *ELIMINATED*\n@${v.jid.split("@")[0]} has been lynched by the town — ${icon} ${role}`,
                        mentions: [v.jid]
                    }).catch(() => {});
                }

                // --- PHASE 4: WIN CHECK ---
                const winner = m.win(g);
                if (winner) {
                    await sock.sendMessage(gid, { text: `🏆 *GAME OVER: ${winner} WIN!*` }).catch(() => {});
                    const reveal = m.reveal(g);
                    await sock.sendMessage(gid, { text: reveal.text, mentions: reveal.mentions }).catch(() => {});
                    m.endGame(gid);
                    return;
                }

                // --- PHASE 5: RECURSE TO NEXT NIGHT ---
                g.phase = "night";
                g.lastActivity = Date.now();
                await sock.sendMessage(gid, { text: "🌙 *Night falls once again...*\nRoles, check your DMs!" }).catch(() => {});
                gameLoop(sock, gid);

            }, m.VOTE);
        }, m.DISCUSS);
    }, m.NIGHT);
}