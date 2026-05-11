module.exports = async (sock, msg, from, rawText, args) => {
    try {
        const sender = msg.key.participant || msg.key.remoteJid;
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        let playerA, playerB;

        // Determine Player A and Player B
        if (mentions.length >= 2) {
            playerA = mentions[0];
            playerB = mentions[1];
        } else if (mentions.length === 1) {
            playerA = sender;
            playerB = mentions[0];
        } else if (quoted) {
            playerA = sender;
            playerB = quoted;
        } else {
            return sock.sendMessage(from, { 
                text: "⚔️ *Azar War Arena*\n━━━━━━━━━━━━━━\nUsage:\n1. Reply to someone with `.war` to fight them.\n2. Mention someone: `.war @user`.\n3. Mention two people: `.war @user1 @user2`." 
            }, { quoted: msg });
        }

        if (playerA === playerB) {
            return sock.sendMessage(from, { text: "❌ You can't fight yourself! (Unless you have multiple personalities...)" }, { quoted: msg });
        }

        // ─── GENERATE STATS ───
        const stats = ["Brain", "Personality", "Look", "Speed", "Drama", "Aura", "Luck", "Battle IQ", "Strength"];
        const dataA = {};
        const dataB = {};
        let scoreA = 0;
        let scoreB = 0;

        stats.forEach(stat => {
            const valA = Math.floor(Math.random() * 51) + 49; // 49-100
            const valB = Math.floor(Math.random() * 51) + 49;
            dataA[stat] = valA;
            dataB[stat] = valB;
            if (valA > valB) scoreA++;
            else if (valB > valA) scoreB++;
        });

        const winner = scoreA >= scoreB ? playerA : playerB;
        const winEmoji = scoreA >= scoreB ? "🏆" : "🏅";

        // ─── BUILD UI ───
        const nameA = playerA.split("@")[0];
        const nameB = playerB.split("@")[0];

        let response = `⚔️ *AZAHRA BATTLE ARENA* ⚔️\n━━━━━━━━━━━━━━━\n`;
        response += `🔴 *CHALLENGER:* @${nameA}\n🔵 *DEFENDER:* @${nameB}\n━━━━━━━━━━━━━━━\n\n`;

        stats.forEach(stat => {
            const valA = dataA[stat];
            const valB = dataB[stat];
            const barA = drawBar(valA);
            const barB = drawBar(valB);
            
            const lead = valA > valB ? "🟥" : (valB > valA ? "🟦" : "⬜");
            
            response += `📊 *${stat.toUpperCase()}*\n`;
            response += `${lead} @${nameA.slice(0,5)}: ${barA} (${valA})\n`;
            response += `${lead} @${nameB.slice(0,5)}: ${barB} (${valB})\n\n`;
        });

        const battleEvents = [
            `💥 @${nameA} used *Critical Strike*!`,
            `🛡️ @${nameB} activated *Iron Defense*!`,
            `🔮 @${nameA} cast *Domain Expansion*!`,
            `⚡ @${nameB} countered with *Divine Speed*!`,
            `🎬 @${nameA} created a *Drama Scene*!`,
            `💅 @${nameB} flexed their *Aesthetic Look*!`,
            `🧠 @${winner.split("@")[0]} won with *Galaxy Brain* logic!`,
            `🍀 Luck favors @${winner.split("@")[0]} today!`
        ];
        const randomEvent = battleEvents[Math.floor(Math.random() * battleEvents.length)];

        response += `━━━━━━━━━━━━━━━\n🎬 *BATTLE SUMMARY:*\n${randomEvent}\n\n`;
        response += `${winEmoji} *WINNER:* @${winner.split("@")[0]}\n`;
        response += `⭐ *BATTLE SCORE:* ${Math.max(scoreA, scoreB)} - ${Math.min(scoreA, scoreB)}\n`;
        response += `━━━━━━━━━━━━━━━\n> Azahrabot Ultimate`;

        await sock.sendMessage(from, { 
            text: response, 
            mentions: [playerA, playerB] 
        }, { quoted: msg });

    } catch (err) {
        console.error(".war error:", err);
        await sock.sendMessage(from, { text: "❌ The arena collapsed! (Battle Error)" }, { quoted: msg });
    }
};

function drawBar(value) {
    const total = 10;
    const filled = Math.round((value / 100) * total);
    const empty = total - filled;
    return "█".repeat(filled) + "░".repeat(empty);
}
