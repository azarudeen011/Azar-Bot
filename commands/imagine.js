// ==============================================
// 🖼️ Azahrabot — .imagine Command (Elite API)
// Direct Image Fetch — Fast & Stable
// ==============================================

const axios = require("axios");
const settings = require("../settings");

module.exports = async (sock, msg, from, text, args = []) => {

try{

const prompt = args.join(" ").trim();

if(!prompt){
return sock.sendMessage(from,{
text:
`🎨 Usage:\n${settings.prefix}imagine <prompt>\n\nExample:\n${settings.prefix}imagine two couples under moon shadow`
},{quoted:msg});
}

// ⭐ cooldown protection (important public bot)
global.imgCD ??= new Map();

if(global.imgCD.get(from) && Date.now()-global.imgCD.get(from)<15000){
return sock.sendMessage(from,{
text:"⏳ Wait 15 seconds before next image."
},{quoted:msg});
}

global.imgCD.set(from,Date.now());

await sock.sendMessage(from,{react:{text:"🎨",key:msg.key}}).catch(()=>{});

await sock.sendPresenceUpdate("composing",from);

const url =
`https://eliteprotech-apis.zone.id/imagine?prompt=${encodeURIComponent(prompt)}`;

const res = await axios({
url,
responseType:"arraybuffer",
timeout:60000
});

const buffer = Buffer.from(res.data);

await sock.sendMessage(from,{
image:buffer,
caption:
`✨ *AI Image Generated*\n`+
`🎨 Prompt: ${prompt}\n`+
`━━━━━━━━━━━━\n`+
`> Powered by ${settings.author || "AzarTech"} ⚡`
},{quoted:msg});

await sock.sendMessage(from,{react:{text:"✅",key:msg.key}}).catch(()=>{});

}catch(err){

console.log("Imagine API Error:",err.message);

await sock.sendMessage(from,{
text:"⚠️ Image generation failed. Try again later."
},{quoted:msg});

await sock.sendMessage(from,{react:{text:"⚠️",key:msg.key}}).catch(()=>{});

}

};