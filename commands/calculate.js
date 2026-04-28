module.exports = async (sock, msg, from, rawText, args) => {
    const text = args.join(" ");
    if (!text) {
        return sock.sendMessage(from, { text: "⚠️ Usage: `.calculate 5 + 5`\nSupports standard math and Math.sqrt, Math.pow, etc." }, { quoted: msg });
    }
    
    try {
        // Safe evaluation string manipulation
        let cleanText = text.replace(/[^0-9+\-*/(). Math]/g, "");
        if (!cleanText) throw new Error("Invalid characters");
        
        // Handle common words like root
        if (text.toLowerCase().includes("root") && !cleanText.includes("Math.sqrt")) {
             const num = text.match(/\d+/);
             if (num) cleanText = `Math.sqrt(${num[0]})`;
        }
        
        // eslint-disable-next-line no-eval
        const result = eval(cleanText);
        
        await sock.sendMessage(from, { 
            text: `🧮 *Azar Calculator*\n━━━━━━━━━━━━━━\n*Expression:*\n\`${cleanText}\`\n\n*Result:*\n*${result}*\n━━━━━━━━━━━━━━`
        }, { quoted: msg });
    } catch (err) {
        await sock.sendMessage(from, { text: "❌ Invalid mathematical expression!" }, { quoted: msg });
    }
};
