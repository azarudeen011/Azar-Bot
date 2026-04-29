// lib/guards.js
// Central permission handler for group commands
// Supports: group admins, paired owner (if admin), normal users (for general cmds)

const settings = require("../settings");

/**
 * Checks if the user is the paired bot owner.
 */
function isPairedOwner(msg) {
  const sender = msg.key.participant || msg.key.remoteJid || "";
  const ownerNumber = (settings.ownerNumber || "").replace(/[^0-9]/g, "");
  const ownerLid = settings.ownerLid || "";
  
  if (msg.key.fromMe) return true;
  
  // Check Number
  if (ownerNumber && sender.includes(ownerNumber)) return true;
  
  // Check LID (Exact match)
  if (ownerLid && sender === ownerLid) return true;
  
  return false;
}

/**
 * Fetch group admins safely
 */
async function getGroupAdmins(sock, groupJid) {
  try {
    const meta = await sock.groupMetadata(groupJid);
    return (meta?.participants || [])
      .filter(p => p.admin)
      .map(p => p.id);
  } catch (err) {
    console.warn("⚠️ guards.getGroupAdmins:", err.message);
    return [];
  }
}

/**
 * Check if user can run an admin-only command
 * - Must be admin OR paired owner who is also admin
 */
async function canRunAdminCommand(sock, msg, groupJid) {
  const sender = msg.key.participant || msg.key.remoteJid || "";
  const admins = await getGroupAdmins(sock, groupJid);
  const owner = isPairedOwner(msg);

  // Owner can run admin commands ONLY if they’re admin in that group
  if (owner && admins.includes(sender)) return true;

  // Regular admins can also run admin-only commands
  if (admins.includes(sender)) return true;

  return false;
}

/**
 * Check if user can run a general group command
 * - Everyone can, but only in group
 */
function canRunGeneralCommand(from) {
  return from.endsWith("@g.us");
}

module.exports = {
  isPairedOwner,
  canRunAdminCommand,
  canRunGeneralCommand,
  getGroupAdmins
};
