module.exports = async (sock, msg, from, rawText, args) => {
    const text = args.join(" ").toLowerCase().trim();
    if (!text) {
        return sock.sendMessage(from, { 
            text: "🔍 *Azar Math Solver*\n━━━━━━━━━━━━━━\nUsage: `.calculate 10 + 9 - 4 * 3` or `.calculate sqrt(25) + sin(pi/2)`\n\n*Supports:* +, -, *, /, %, ^, sqrt, sin, cos, tan, log, ln, pi, e" 
        }, { quoted: msg });
    }
    
    try {
        // Pre-processing to support common human-readable symbols
        let expression = text
            .replace(/x/g, "*")
            .replace(/÷/g, "/")
            .replace(/\^/g, "**")
            .replace(/pi/g, "Math.PI")
            .replace(/e/g, "Math.E")
            .replace(/sqrt/g, "Math.sqrt")
            .replace(/sin/g, "Math.sin")
            .replace(/cos/g, "Math.cos")
            .replace(/tan/g, "Math.tan")
            .replace(/log/g, "Math.log10")
            .replace(/ln/g, "Math.log")
            .replace(/pow/g, "Math.pow")
            .replace(/abs/g, "Math.abs");

        // Secure Regex: Allow only numbers, operators, and Math object calls
        // We only allow specific characters and the "Math." prefix we just added
        const allowedRegex = /^[0-9+\-*/(). %*MathPIE.sqrtincoaslgnpw]+$/;
        
        if (!allowedRegex.test(expression)) {
            throw new Error("Invalid characters detected");
        }
        
        // eslint-disable-next-line no-eval
        const result = eval(expression);
        
        if (result === undefined || isNaN(result)) {
            throw new Error("Calculation failed");
        }

        const replyMsg = `🧮 *Azar Calculator*\n━━━━━━━━━━━━━━\n` +
                         `📝 *Input:* \`${text}\`\n` +
                         `⚙️ *Solving:* \`${expression.replace(/Math\./g, "")}\`\n\n` +
                         `✅ *Result:* *${result}*\n━━━━━━━━━━━━━━`;
        
        await sock.sendMessage(from, { text: replyMsg }, { quoted: msg });

    } catch (err) {
        console.error("Calculator Error:", err);
        await sock.sendMessage(from, { 
            text: "❌ *Invalid Expression!*\n\nPlease ensure your math is correct. Example:\n`.calculate 10 + 5 * 2`" 
        }, { quoted: msg });
    }
};
