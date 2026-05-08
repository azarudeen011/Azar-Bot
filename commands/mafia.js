const m = require("../lib/mafiaEngine");

module.exports = async (sock, msg, from, text, args = []) => {

const sender =
msg.key.fromMe
? sock.user.id
: (msg.key.participant || msg.key.remoteJid);

const cmd = args[0]?.toLowerCase();
const isGroup = from.endsWith("@g.us");

// 🧹 RAM GARBAGE COLLECTOR: Clean abandoned mafia lobbies
for (const gid in m.games) {
    const g = m.games[gid];
    // If lobby inactive for over 30 mins
    if (g.phase === "lobby" && Date.now() - (g.created || 0) > 1800000) {
        m.endGame(gid); // Clean players' sessions and delete game
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

};



// ================= GAME LOOP =================
async function gameLoop(sock,gid) {
  const g = m.games[gid];
  if(!g) return;

  const safeExecute = async (fn) => {
    try {
      if(!m.games[gid]) return; // Stop if game ended externally
      await fn();
    } catch (err) {
      console.log("Mafia game tick error:", err);
    }
  };

  // ===== NIGHT TIMER =====
  setTimeout(() => safeExecute(async () => {
    const deaths = m.resolveNight(g);

    if(!deaths.length) {
      await sock.sendMessage(gid,{
        text:"🌙 No one was killed tonight\n\n☀️ Discussion Time"
      });
    } else {
      let text = "💀 *Night Result*\n\n";
      let mentions = [];
      for(const d of deaths) {
        let role = "CIVILIAN";
        if(d.role==="mafia") role="MAFIA";
        if(d.role==="doctor") role="DOCTOR";
        text += `☠️ @${d.jid.split("@")[0]} got killed — (${role})\n`;
        mentions.push(d.jid);
      }
      text += "\n☀️ Discussion Time";
      await sock.sendMessage(gid,{ text, mentions });
    }

    // ===== DISCUSSION TIMER =====
    setTimeout(() => safeExecute(async () => {
      g.phase="vote";
      await sock.sendMessage(gid,{
        text:"🗳️ Voting started! Use *.mafia vote <num>*"
      });

      // ===== VOTE TIMER =====
      setTimeout(() => safeExecute(async () => {
        const v = m.resolveVote(g);
        if(v.tie) {
          await sock.sendMessage(gid,{
            text:"⚖️ Voting Tie — Nobody Eliminated"
          });
        } else {
          let role="CIVILIAN";
          let icon="👤";
          if(v.role==="mafia"){role="MAFIA"; icon="🔪";}
          if(v.role==="doctor"){role="DOCTOR"; icon="💉";}
          await sock.sendMessage(gid,{
            text:`🚫 @${v.jid.split("@")[0]} Eliminated — ${icon} ${role}`,
            mentions:[v.jid]
          });
        }

        // ===== WIN CHECK =====
        const win = m.win(g);
        if(win) {
          await sock.sendMessage(gid,{ text:`🏆 *${win} WIN!*` });
          const reveal = m.reveal(g);
          await sock.sendMessage(gid,{
            text: reveal.text,
            mentions: reveal.mentions
          });
          m.endGame(gid);
          return;
        }

        // ===== NEXT NIGHT =====
        g.phase="night";
        await sock.sendMessage(gid,{ text:"🌙 Next Night Begins..." });
        
        // Loop recursively safely
        gameLoop(sock,gid);

      }), m.VOTE);
    }), m.DISCUSS);
  }), m.NIGHT);
}