const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/economy.json');

// Initialize DB if not exists
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));

function loadDB() {
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Economy Save Error:", e.message);
    }
}

const STARTING_BALANCE = 5000;

module.exports = {
    getUser: (jid) => {
        const db = loadDB();
        if (!db[jid]) {
            db[jid] = { balance: STARTING_BALANCE, lastDaily: 0, totalWon: 0, totalLost: 0 };
            saveDB(db);
        }
        return db[jid];
    },
    
    addMoney: (jid, amount) => {
        const db = loadDB();
        if (!db[jid]) db[jid] = { balance: STARTING_BALANCE, lastDaily: 0, totalWon: 0, totalLost: 0 };
        db[jid].balance += amount;
        if (amount > 0) db[jid].totalWon += amount;
        saveDB(db);
        return db[jid].balance;
    },

    removeMoney: (jid, amount) => {
        const db = loadDB();
        if (!db[jid]) db[jid] = { balance: STARTING_BALANCE, lastDaily: 0, totalWon: 0, totalLost: 0 };
        if (db[jid].balance < amount) return false;
        db[jid].balance -= amount;
        db[jid].totalLost += amount;
        saveDB(db);
        return db[jid].balance;
    },

    checkDaily: (jid) => {
        const db = loadDB();
        if (!db[jid]) db[jid] = { balance: STARTING_BALANCE, lastDaily: 0, totalWon: 0, totalLost: 0 };
        const now = Date.now();
        const TWELVE_HOURS = 12 * 60 * 60 * 1000;
        
        if (now - db[jid].lastDaily >= TWELVE_HOURS) {
            const reward = Math.floor(Math.random() * 2000) + 1000; // 1000 to 3000
            db[jid].balance += reward;
            db[jid].lastDaily = now;
            saveDB(db);
            return { success: true, reward, newBalance: db[jid].balance };
        } else {
            const remaining = TWELVE_HOURS - (now - db[jid].lastDaily);
            return { success: false, remaining };
        }
    },
    
    getLeaderboard: (limit = 10) => {
        const db = loadDB();
        const arr = Object.keys(db).map(jid => ({ jid, balance: db[jid].balance }));
        arr.sort((a, b) => b.balance - a.balance);
        return arr.slice(0, limit);
    }
};
