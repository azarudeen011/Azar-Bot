// ==============================================
// 🧠 Azahrabot TotalCmd Command (v1.0)
// Counts all executable commands — owner/public
// ==============================================

const fs = require("fs");
const path = require("path");

module.exports = async (sock, msg, from) => {
    try {
        const cmdDir = path.join(process.cwd(), "commands");

        if (!fs.existsSync(cmdDir)) {
            return await sock.sendMessage(from, { text: "⚠️ Command directory not found!" }, { quoted: msg });
        }

        // 🧠 Recursive function to count .js files
        const countCommands = (dir) => {
            let count = 0;
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    count += countCommands(fullPath);
                } else if (file.endsWith(".js")) {
                    count++;
                }
            }
            return count;
        };

        const total = countCommands(cmdDir);

        // 🧾 Build premium response message
        const message = `
╔═══════════════════════════════╗
   🤖 *𝗔 𝗭 𝗔 𝗛 𝗥 𝗔 𝗕 𝗢 𝗧*  ⚡ 
╚═══════════════════════════════╝
🌀 *𝗕𝗢𝗧 𝗠𝗘𝗧𝗥𝗜𝗖𝗦*
━━━━━━━━━━━━━━━━━━━━
📦 *Total Commands:* ${total}
📂 *Category:* Fully Loaded
🚀 *Status:* Online & Ready
━━━━━━━━━━━━━━━━━━━━
> Status: *Online & Optimized*
`.trim();

        await sock.sendMessage(from, { text: message }, { quoted: msg });

    } catch (err) {
        console.error("❌ Error in totalcmd command:", err.message);
        await sock.sendMessage(from, { text: "⚠️ Failed to count commands." }, { quoted: msg });
    }
};
