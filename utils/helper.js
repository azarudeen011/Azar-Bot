// ==============================================
// 🧠 Azahrabot Utility Helper (v4.2.3)
// Text normalization + readable uptime format
// ==============================================

module.exports = {
  // 🧹 Clean and normalize user input (commands)
  normalize: (body = "") => {
    return body
      .toString()
      .trim()
      .toLowerCase()
      .replace(/^[./!#]/, "") // remove common bot prefixes
      .replace(/\s+/g, " ") // normalize multiple spaces
      .replace(/[^\x20-\x7E]/g, "") // remove non-ASCII (emoji/noise)
      .trim();
  },

  // 🕒 Convert process uptime into readable format
  runtimeString: () => {
    const uptime = process.uptime();
    const days = Math.floor(uptime / (24 * 3600));
    const hours = Math.floor((uptime % (24 * 3600)) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    const parts = [];
    if (days) parts.push(`${days}d`);
    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || !parts.length) parts.push(`${seconds}s`);
    return parts.join(" ");
  },

  // 💬 Capitalize first letter of a word
  capitalize: (text = "") =>
    text.charAt(0).toUpperCase() + text.slice(1).toLowerCase(),
};
