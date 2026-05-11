module.exports = async (sock, msg, from, rawText, args) => {
    try {
        const cmd = args[0] ? args[0].toLowerCase() : "gay";
        const sender = msg.key.participant || msg.key.remoteJid;
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
        
        let targetA, targetB;

        if (mentions.length >= 2) {
            targetA = mentions[0];
            targetB = mentions[1];
        } else if (mentions.length === 1) {
            targetA = sender;
            targetB = mentions[0];
        } else if (quoted) {
            targetA = sender;
            targetB = quoted;
        } else {
            return sock.sendMessage(from, { 
                text: `🌈 *Azar LGBTQ+ Meter*\n━━━━━━━━━━━━━━\nUsage:\n1. Reply to someone with \`.${cmd}\`\n2. Mention someone: \`.${cmd} @user\`\n3. Mention two: \`.${cmd} @user1 @user2\`` 
            }, { quoted: msg });
        }

        const nameA = targetA.split("@")[0];
        const nameB = targetB.split("@")[0];
        const percentage = Math.floor(Math.random() * 101);

        const roasts = {
            gay: [
                `🏳️‍🌈 *GAY ALERT!* @${nameA} and @${nameB} were seen browsing rainbow flags together!`,
                `👬 @${nameA} and @${nameB}? The chemistry is too high to be just 'bros'.`,
                `🌈 Look! Gay spotted in our gc @${nameA} with @${nameB}!`,
                `🤫 We all know @${nameA} has a crush on @${nameB}...`,
                `🏳️‍🌈 Stop hiding it! @${nameA} and @${nameB} are the new power couple!`
            ],
            trans: [
                `🏳️‍⚧️ *TRANSFORMATION!* @${nameA} and @${nameB} are transitioning into the best couple ever!`,
                `🌈 @${nameA} and @${nameB} are looking fabulous in their opposite gender roles!`,
                `✨ The transformation into love is real... @${nameA} ❤️ @${nameB}`
            ],
            lesbian: [
                `🏳️‍🌈 *LESBIAN POWER!* @${nameA} and @${nameB} are officially the coolest girls in the chat!`,
                `👭 Girlfriends? @${nameA} and @${nameB} seem to think so!`,
                `🌈 @${nameA} and @${nameB} are giving major 'bestie' vibes... but we know the truth!`
            ],
            lgbt: [
                `🏳️‍🌈 *PRIDE SQUAD!* @${nameA} and @${nameB} are the heart of the community!`,
                `🌈 Love is love! @${nameA} and @${nameB} are ${percentage}% match for the Pride Parade!`,
                `✨ @${nameA} and @${nameB} are shining with rainbow energy today!`
            ]
        };

        const list = roasts[cmd] || roasts.gay;
        const randomRoast = list[Math.floor(Math.random() * list.length)];

        let response = `🌈 *AZAHRA ${cmd.toUpperCase()} DETECTOR* 🌈\n━━━━━━━━━━━━━━\n\n`;
        response += `👤 @${nameA}\n👤 @${nameB}\n\n`;
        response += `📊 *RESULT:* ${percentage}%\n`;
        response += `📝 *REPORT:* ${randomRoast}\n\n`;
        response += `━━━━━━━━━━━━━━\n> Azahrabot Fun Core`;

        await sock.sendMessage(from, { 
            text: response, 
            mentions: [targetA, targetB] 
        }, { quoted: msg });

    } catch (err) {
        console.error(".lgbt error:", err);
        await sock.sendMessage(from, { text: "❌ The rainbow faded away! (Error)" }, { quoted: msg });
    }
};
