module.exports = async (sock, msg, from, rawText, args) => {
    const text = args.join(" ").trim();
    
    if (!text) {
        return sock.sendMessage(from, { 
            text: "✒️ *Azar Ultimate Font Styler*\n━━━━━━━━━━━━━━\nUsage: `.font <text>`\n\nTransforms your text into 30+ high-quality styles for your profile, bio, or messages!\n\n*Example:* `.font Azahra Bot`" 
        }, { quoted: msg });
    }

    if (text.length > 500) {
        return sock.sendMessage(from, { text: "❌ *Text too long!* Please keep it under 500 characters." }, { quoted: msg });
    }

    // ─── POWERFUL FONT ENGINE ───
    const styles = [
        { name: "Bold Serif", mapper: (t) => mapChars(t, "𝐀", "𝐚", "𝟎") },
        { name: "Italic Serif", mapper: (t) => mapChars(t, "𝐴", "𝑎", "0") },
        { name: "Bold Italic Serif", mapper: (t) => mapChars(t, "𝑨", "𝒂", "0") },
        { name: "Bold Sans", mapper: (t) => mapChars(t, "𝗔", "𝗮", "𝟬") },
        { name: "Italic Sans", mapper: (t) => mapChars(t, "𝘈", "𝘢", "0") },
        { name: "Bold Italic Sans", mapper: (t) => mapChars(t, "𝘼", "𝙖", "0") },
        { name: "Script", mapper: (t) => mapChars(t, "𝒜", "𝒶", "0", "script") },
        { name: "Bold Script", mapper: (t) => mapChars(t, "𝓐", "𝓪", "0") },
        { name: "Fraktur", mapper: (t) => mapChars(t, "𝔄", "𝔞", "0", "fraktur") },
        { name: "Bold Fraktur", mapper: (t) => mapChars(t, "𝕬", "𝖆", "0") },
        { name: "Double Struck", mapper: (t) => mapChars(t, "𝔸", "𝕒", "𝟘", "double") },
        { name: "Monospace", mapper: (t) => mapChars(t, "𝙰", "𝚊", "𝟶") },
        { name: "Fullwidth", mapper: (t) => mapChars(t, "Ａ", "ａ", "０") },
        { name: "Circled", mapper: (t) => mapChars(t, "Ⓐ", "ⓐ", "⓪") },
        { name: "Circled Dark", mapper: (t) => mapChars(t, "🅐", "𝗮", "𝟬") },
        { name: "Squared", mapper: (t) => mapChars(t, "🄰", "🄰", "0") },
        { name: "Squared Dark", mapper: (t) => mapChars(t, "🅰", "🅰", "0") },
        { name: "Small Caps", mapper: (t) => mapChars(t, "ᴀ", "ᴀ", "0", "smallcaps") },
        { name: "Parenthesized", mapper: (t) => mapChars(t, "⒜", "⒜", "⑴") },
        { name: "Bubbles", mapper: (t) => mapChars(t, "ⓐ", "ⓐ", "⓪") },
        { name: "Strikethrough", mapper: (t) => decorate(t, "\u0336") },
        { name: "Slash", mapper: (t) => decorate(t, "\u0338") },
        { name: "Underline", mapper: (t) => decorate(t, "\u0332") },
        { name: "Double Underline", mapper: (t) => decorate(t, "\u0333") },
        { name: "Wavy", mapper: (t) => decorate(t, "\u0330") },
        { name: "Bridge Above", mapper: (t) => decorate(t, "\u0346") },
        { name: "Arrow Below", mapper: (t) => decorate(t, "\u034D") },
        { name: "Aesthetic", mapper: (t) => t.split("").join(" ") },
        { name: "Mirror", mapper: (t) => reverseText(t) },
        { name: "Inverted", mapper: (t) => invertText(t) }
    ];

    let response = `✒️ *Azar Font Master* [v2.0]\n━━━━━━━━━━━━━━\n📝 *Input:* \`${text}\`\n━━━━━━━━━━━━━━\n\n`;
    
    styles.forEach((style, index) => {
        try {
            const styledText = style.mapper(text);
            response += `*${index + 1}. ${style.name}*\n${styledText}\n\n`;
        } catch (e) {
            console.error(`Font error in ${style.name}:`, e);
        }
    });

    response += `━━━━━━━━━━━━━━\n💡 *Tip:* Long press to copy any style!`;

    await sock.sendMessage(from, { text: response }, { quoted: msg });
};

// ─── HELPERS ───

function mapChars(text, upperStart, lowerStart, digitStart, type = "normal") {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const digits = "0123456789";

    const uStart = upperStart.codePointAt(0);
    const lStart = lowerStart.codePointAt(0);
    const dStart = digitStart.codePointAt(0);

    // Handle Unicode "Gaps" for specific styles
    const exceptions = {
        script: { 'B': 'ℬ', 'E': 'ℰ', 'F': 'ℱ', 'H': 'ℋ', 'I': 'ℐ', 'L': 'ℒ', 'M': 'ℳ', 'R': 'ℛ', 'e': 'ℯ', 'g': 'ℊ', 'o': 'ℴ' },
        fraktur: { 'C': 'ℭ', 'H': 'ℌ', 'I': 'ℑ', 'R': 'ℜ', 'Z': 'ℨ' },
        double: { 'C': 'ℂ', 'H': 'ℍ', 'N': 'ℕ', 'P': 'ℙ', 'Q': 'ℚ', 'R': 'ℝ', 'Z': 'ℤ' },
        smallcaps: { 'L': 'ʟ', 'I': 'ɪ', 'N': 'ɴ' } // Example exceptions
    };

    const ex = exceptions[type] || {};

    return text.split('').map(char => {
        if (ex[char]) return ex[char];
        
        let idx = upper.indexOf(char);
        if (idx !== -1) return String.fromCodePoint(uStart + idx);
        
        idx = lower.indexOf(char);
        if (idx !== -1) return String.fromCodePoint(lStart + idx);
        
        idx = digits.indexOf(char);
        if (idx !== -1) return String.fromCodePoint(dStart + idx);
        
        return char;
    }).join('');
}

function decorate(text, char) {
    return text.split('').map(c => c + char).join('');
}

function reverseText(text) {
    return text.split('').reverse().join('');
}

function invertText(text) {
    const normal = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?.";
    const inverted = "ɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz∀𐐒ƆᗡƎℲ⅁HIſʞ˥WNOԀΌᴚS┴∩ΛMX⅄Z0ƖᄅƐㄣϛ9ㄥ86¡¿˙";
    return text.split('').map(c => {
        const idx = normal.indexOf(c);
        return idx !== -1 ? inverted[idx] : c;
    }).reverse().join('');
}
