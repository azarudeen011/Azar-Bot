module.exports = async (sock, msg, from, text, args) => { return require('../../lib/voiceChanger')(sock, msg, from, text, "robot"); };
