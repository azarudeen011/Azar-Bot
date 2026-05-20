// commands/listbadword.js
// Lists all saved bad words from the antibadword system
const antiBad = require("../lib/small_lib/anti/antibadword");

module.exports = async function (sock, msg, from, text, args) {
    try {
        // Admin-only check
        const { checkAdminPermissions } = require("../lib/guards");
        const perms = await checkAdminPermissions(sock, msg, from);
        if (!perms.isSenderAdmin && !perms.isOwner && !perms.isSudo) {
            return sock.sendMessage(from, { text: "❌ Only admins can view the bad word list." }, { quoted: msg });
        }

        const words = antiBad.getBadWords();

        if (!words || words.length === 0) {
            return sock.sendMessage(from, {
                text: `🚫 *BAD WORD LIST* 🚫\n\nNo custom bad words saved yet.\n\n💡 Add one: \`.addbadword <word>\``
            }, { quoted: msg });
        }

        let list = `🚫 *BAD WORD LIST* (${words.length} words) 🚫\n━━━━━━━━━━━━━━━━━━━━\n\n`;
        words.forEach((w, i) => {
            list += `${i + 1}. \`${w}\`\n`;
        });
        list += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        list += `💡 *.addbadword <word>* — Add a word\n`;
        list += `💡 *.delbadword <word>* — Remove a word`;

        return sock.sendMessage(from, { text: list }, { quoted: msg });
    } catch (e) {
        console.error(".listbadword error:", e);
        return sock.sendMessage(from, { text: "❌ Failed to fetch bad word list." }, { quoted: msg });
    }
};
