const fs = require('fs');
const path = require('path');

const sudoFile = path.join(process.cwd(), 'data', 'sudos.json');

// Ensure directory exists
if (!fs.existsSync(path.dirname(sudoFile))) {
    fs.mkdirSync(path.dirname(sudoFile), { recursive: true });
}

// Initialize file if not exists
if (!fs.existsSync(sudoFile)) {
    fs.writeFileSync(sudoFile, JSON.stringify({}, null, 2));
}

const sudoManager = {
    /**
     * Fetch all Sudo users
     * @returns {Promise<Object>} Object mapping phone numbers to true
     */
    fetchSudos: async () => {
        try {
            const data = fs.readFileSync(sudoFile, 'utf8');
            return JSON.parse(data) || {};
        } catch (e) {
            console.error("❌ Error reading sudos.json:", e.message);
            return {};
        }
    },

    /**
     * Add a user to Sudo list
     * @param {string} jid The user JID or phone
     */
    addSudo: async (jid) => {
        try {
            const phone = jid.split('@')[0].split(':')[0];
            const sudos = await sudoManager.fetchSudos();
            sudos[phone] = true;
            fs.writeFileSync(sudoFile, JSON.stringify(sudos, null, 2));
        } catch (e) {
            console.error("❌ Error adding Sudo:", e.message);
        }
    },

    /**
     * Remove a user from Sudo list
     * @param {string} jid The user JID or phone
     */
    removeSudo: async (jid) => {
        try {
            const phone = jid.split('@')[0].split(':')[0];
            const sudos = await sudoManager.fetchSudos();
            if (sudos[phone]) {
                delete sudos[phone];
                fs.writeFileSync(sudoFile, JSON.stringify(sudos, null, 2));
            }
        } catch (e) {
            console.error("❌ Error removing Sudo:", e.message);
        }
    }
};

module.exports = sudoManager;
