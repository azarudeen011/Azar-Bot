/**
 * AzahraBot Casino Cooldown Manager
 * Per-User, Per-Game Isolation
 */

const cooldowns = new Map();

module.exports = {
    /**
     * Checks if a user is on cooldown for a specific game.
     * @returns { onCooldown: boolean, remaining: number }
     */
    check(userId, game) {
        const now = Date.now();
        const key = `${userId}_${game}`;
        
        if (cooldowns.has(key)) {
            const expireAt = cooldowns.get(key);
            if (now < expireAt) {
                const remaining = Math.ceil((expireAt - now) / 1000);
                return { onCooldown: true, remaining };
            } else {
                cooldowns.delete(key); // Cleanup expired
            }
        }
        
        return { onCooldown: false, remaining: 0 };
    },

    /**
     * Sets a cooldown for a user on a specific game.
     * @param {number} seconds - Default is 300 (5 minutes)
     */
    set(userId, game, seconds = 300) {
        const expireAt = Date.now() + (seconds * 1000);
        cooldowns.set(`${userId}_${game}`, expireAt);
    },

    /**
     * Returns all active cooldowns for a specific user.
     */
    getUserCooldowns(userId) {
        const now = Date.now();
        const results = [];
        
        for (const [key, expireAt] of cooldowns.entries()) {
            if (key.startsWith(userId)) {
                const game = key.split('_')[1];
                const remaining = Math.ceil((expireAt - now) / 1000);
                if (remaining > 0) {
                    results.push({ game, remaining });
                } else {
                    cooldowns.delete(key);
                }
            }
        }
        
        return results;
    },

    /**
     * Formats seconds into M:S
     */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    }
};
