// ==============================================
// 📊 Azahrabot Activity Tracker (v2.0)
// Tracks last active time for every user in groups
// Real-time accurate for `.listonline` command
// ==============================================

const activity = {}; // { groupJid: { userJid: lastActiveTimestamp } }

function attachActivityTracker(sock) {
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      const from = msg.key.remoteJid;
      const participant = msg.key.participant || msg.key.remoteJid;
      if (!from.endsWith("@g.us")) continue; // only track groups
      if (!participant || participant === sock.user?.id || participant.includes(sock.user?.id?.split(":")[0])) continue; // ignore self (all formats)
      if (!activity[from]) activity[from] = {};
      activity[from][participant] = Date.now();
    }
  });
}

// Cleanup older entries (>24h old)
function cleanup() {
  const now = Date.now();
  for (const group in activity) {
    for (const user in activity[group]) {
      if (now - activity[group][user] > 24 * 60 * 60 * 1000) {
        delete activity[group][user];
      }
    }
  }
}

// Get active users (last 10 mins)
function getActiveMembers(groupJid, meta, minutes = 10) {
  const now = Date.now();
  const group = activity[groupJid] || {};
  const members = meta.participants.map((p) => p.id);
  const active = [];

  for (const member of members) {
    const last = group[member];
    if (last && now - last <= minutes * 60 * 1000) active.push(member);
  }
  return active;
}

module.exports = { attachActivityTracker, getActiveMembers, cleanup };
