// ==============================================
// lib/lightweight_store.js (Optimized v2.2)
// 💾 Persistent store with size & age limits
// ==============================================

const fs = require("fs");
const path = require("path");

const SESSION_DIR = path.join(__dirname, "../.auth/store");
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
  console.log("📁 Data store initialized in .auth/store");
}

const STORE_FILE = path.join(SESSION_DIR, "baileys_store.json");
const BACKUP_FILE = path.join(SESSION_DIR, "baileys_store.bak.json");

// 🔽 Restored to 200 – ensures perfect reply recognition in busy groups
let MAX_MESSAGES = 200;
try {
  const settings = require("../settings");
  if (settings.maxStoreMessages) MAX_MESSAGES = settings.maxStoreMessages;
} catch { }

// Message age limit (48 hours)
const MAX_AGE_MS = 48 * 60 * 60 * 1000;

const store = {
  messages: {},
  contacts: {},
  chats: {},
  _lastWrite: 0,

  readFromFile(file = STORE_FILE) {
    try {
      if (!fs.existsSync(file)) return;
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      this.messages = {};
      for (const [jid, msgs] of Object.entries(raw.messages || {})) {
        const map = new Map();
        for (const msg of msgs) {
          const id = (msg && msg.key && msg.key.id) || `${Date.now()}-${Math.random()}`;
          map.set(id, msg);
        }
        this.messages[jid] = map;
      }
      this.contacts = raw.contacts || {};
      this.chats = raw.chats || {};
    } catch (err) {
      console.error("⚠️ Failed to read store:", err.message);
      try {
        fs.renameSync(file, BACKUP_FILE);
        console.log("📦 Corrupted store backed up to:", BACKUP_FILE);
      } catch { }
      this.messages = {};
      this.contacts = {};
      this.chats = {};
    }
  },

  writeToFile(file = STORE_FILE) {
    const now = Date.now();
    if (now - this._lastWrite < 5000) return;
    this._lastWrite = now;

    try {
      const msgObj = {};
      for (const [jid, map] of Object.entries(this.messages)) {
        msgObj[jid] = Array.from(map.values());
      }
      const data = {
        messages: msgObj,
        contacts: this.contacts,
        chats: this.chats,
      };
      fs.writeFileSync(file, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("⚠️ Failed to write store:", err.message);
    }
  },

  // Clean old messages by age
  _cleanByAge() {
    const now = Date.now();
    for (const [jid, map] of Object.entries(this.messages)) {
      for (const [id, msg] of map.entries()) {
        const msgTime = (msg.messageTimestamp || 0) * 1000;
        if (now - msgTime > MAX_AGE_MS) {
          map.delete(id);
        }
      }
    }
  },

  bind(ev) {
    ev.on("messages.upsert", ({ messages }) => {
      for (const msg of messages || []) {
        const jid = msg?.key?.remoteJid;
        const id = msg?.key?.id;
        if (!jid || !id) continue;

        if (!this.messages[jid]) this.messages[jid] = new Map();
        const map = this.messages[jid];

        map.set(id, msg);

        // limit per chat
        if (map.size > MAX_MESSAGES) {
          const keys = Array.from(map.keys());
          const removeCount = map.size - MAX_MESSAGES;
          for (const oldKey of keys.slice(0, removeCount)) {
            map.delete(oldKey);
          }
        }
      }

      // Periodically clean by age (every 100 messages upsert)
      if (Math.random() < 0.01) this._cleanByAge();
    });

    ev.on("contacts.update", (contacts) => {
      for (const c of contacts || []) {
        if (!c.id) continue;
        this.contacts[c.id] = {
          id: c.id,
          name: c.notify || c.name || this.contacts[c.id]?.name || "",
        };
      }
    });

    ev.on("chats.set", ({ chats }) => {
      this.chats = {};
      for (const chat of chats || []) {
        if (!chat.id) continue;
        this.chats[chat.id] = chat;
      }
    });

    ev.on("chats.update", (chats) => {
      for (const chat of chats || []) {
        if (!chat.id) continue;
        this.chats[chat.id] = {
          ...(this.chats[chat.id] || {}),
          ...chat,
        };
      }
    });
  },
};

// Run age cleanup every hour
setInterval(() => store._cleanByAge(), 60 * 60 * 1000);

module.exports = store;