module.exports = async (sock, msg, from, text, args) => {
    if (!text) {
        return sock.sendMessage(from, { text: "⚠️ Usage: `.poll Title | Option1 | Option2 | Option3`" }, { quoted: msg });
    }
    
    const parts = text.split("|").map(p => p.trim());
    const name = parts[0];
    const options = parts.slice(1).filter(p => p);
    
    if (options.length < 2) {
        return sock.sendMessage(from, { text: "⚠️ You must provide at least 2 options.\nExample: `.poll Pizza or Burger? | Pizza | Burger`" }, { quoted: msg });
    }
    
    if (options.length > 12) {
        return sock.sendMessage(from, { text: "⚠️ A poll can have a maximum of 12 options." }, { quoted: msg });
    }
    
    await sock.sendMessage(from, {
        poll: {
            name: name,
            values: options,
            selectableCount: 1
        }
    });
};
