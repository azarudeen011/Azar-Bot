// lib/small_lib/antiGuard.js
const antilink = require("./anti/antilink");

function attachListeners(sock) {
  if (!sock || !sock.ev) {
    console.warn("antiGuard: invalid socket");
    return;
  }

  sock.ev.on("messages.upsert", async (update) => {
    try {
      const messages = update.messages || [];
      for (const msg of messages) {
        if (!msg?.message) continue;
        antilink.checkMessageAndAct(sock, msg).catch((e) => console.error("antiGuard:", e));
      }
    } catch (e) {
      console.error("antiGuard messages.upsert handler error", e);
    }
  });

  console.log("✅ antiGuard attached");
}

module.exports = { attachListeners };
