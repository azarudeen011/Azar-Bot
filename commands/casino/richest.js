const eco = require('../../lib/economy');

module.exports = async (sock, msg, from, text, args) => {
    try {
        const isGroup = from.endsWith('@g.us');

        if (!isGroup) {
            return sock.sendMessage(from, {
                text: "❌ This command can only be used in groups!"
            }, { quoted: msg });
        }

        // Get group members
        let metadata;
        try {
            metadata = await sock.groupMetadata(from);
        } catch (e) {
            return sock.sendMessage(from, {
                text: "❌ Could not fetch group members."
            }, { quoted: msg });
        }

        const members = metadata.participants.map(p => p.id);

        // Get balances for all group members who have economy data
        const ranked = [];
        for (const jid of members) {
            const user = eco.getUser(jid);
            ranked.push({
                jid,
                balance: user.balance,
                totalWon: user.totalWon,
                totalLost: user.totalLost
            });
        }

        // Sort by balance (richest first)
        ranked.sort((a, b) => b.balance - a.balance);

        // Take top 15
        const top = ranked.slice(0, 15);

        if (top.length === 0) {
            return sock.sendMessage(from, {
                text: "❌ No casino players found in this group!"
            }, { quoted: msg });
        }

        const medals = ["🥇", "🥈", "🥉"];
        const bars = ["██████████", "████████░░", "██████░░░░", "████░░░░░░", "██░░░░░░░░"];

        let board = `💎 *GROUP RICHEST LEADERBOARD* 💎\n`;
        board += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        board += `📍 *${metadata.subject}*\n`;
        board += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const mentions = [];

        for (let i = 0; i < top.length; i++) {
            const p = top[i];
            const rank = i < 3 ? medals[i] : `*${i + 1}.*`;
            const bar = bars[Math.min(i, bars.length - 1)];
            const name = `@${p.jid.split("@")[0]}`;
            mentions.push(p.jid);

            board += `${rank} ${name}\n`;
            board += `   💰 *$${p.balance.toLocaleString()}*\n`;

            if (i < 5) {
                board += `   ${bar}\n`;
            }

            if (i < top.length - 1) board += `\n`;
        }

        board += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
        board += `👥 *${members.length}* members | 💰 Top ${top.length} shown\n`;
        board += `💡 _Use \`.daily\` to earn free cash!_`;

        // React
        await sock.sendMessage(from, {
            react: { text: "💎", key: msg.key }
        }).catch(() => {});

        await sock.sendMessage(from, {
            text: board,
            mentions
        }, { quoted: msg });

    } catch (e) {
        console.error("Richest Error:", e);
        await sock.sendMessage(from, {
            text: "❌ Error fetching leaderboard: " + e.message
        }, { quoted: msg });
    }
};
