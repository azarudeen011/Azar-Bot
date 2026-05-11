// ================================================================
// 🌐 Azahrabot Image Uploader (v6.0 Stable)
// Safe fetch polyfill • Works in Replit/Node18/Heroku • No FileType
// Supports: Telegraph → qu.ax → fallback host
// ================================================================

// --- SAFE FETCH INITIALIZER -------------------------------------
if (typeof globalThis.fetch === "undefined") {
    try {
        // Node-fetch v2 (CommonJS compatible). Install if missing: npm i node-fetch@2
        globalThis.fetch = require("node-fetch");
    } catch (e) {
        console.error("❌ fetch unavailable. Install node-fetch@2.");
    }
}

// --- Upload to Telegraph -----------------------------------------
async function uploadTelegraph(buffer) {
    try {
        // Build form data (works in Node and browser)
        let res, form, headers = {};

        if (typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
            form = new FormData();
            form.append('file', new Blob([buffer]), 'image.jpg');
            res = await fetch('https://telegra.ph/upload', { method: 'POST', body: form });
        } else {
            const FormDataNode = require('form-data');
            form = new FormDataNode();
            form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            headers = form.getHeaders();
            res = await fetch('https://telegra.ph/upload', { method: 'POST', body: form, headers });
        }

        const data = await res.json();
        if (!Array.isArray(data)) return null;
        return 'https://telegra.ph' + data[0].src;
    } catch (err) {
        console.log("Telegraph upload failed:", err && err.message ? err.message : err);
        return null;
    }
}

// --- Upload to qu.ax ---------------------------------------------
async function uploadQuax(buffer) {
    try {
        let res, form, headers = {};

        if (typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
            form = new FormData();
            form.append('file', new Blob([buffer]), 'image.jpg');
            res = await fetch('https://qu.ax/upload.php', { method: 'POST', body: form });
        } else {
            const FormDataNode = require('form-data');
            form = new FormDataNode();
            form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            headers = form.getHeaders();
            res = await fetch('https://qu.ax/upload.php', { method: 'POST', body: form, headers });
        }

        const json = await res.json();
        if (!json || !json.files || !json.files[0] || !json.files[0].url) return null;
        return json.files[0].url;
    } catch (err) {
        console.log("qu.ax upload failed:", err && err.message ? err.message : err);
        return null;
    }
}

// --- Fallback Image Host (imgbb clone) ----------------------------
async function uploadFallback(buffer) {
    try {
        let res, form, headers = {};

        if (typeof FormData !== 'undefined' && typeof Blob !== 'undefined') {
            form = new FormData();
            form.append('file', new Blob([buffer]), 'image.jpg');
            res = await fetch('https://0x0.st', { method: 'POST', body: form });
        } else {
            const FormDataNode = require('form-data');
            form = new FormDataNode();
            form.append('file', buffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            headers = form.getHeaders();
            res = await fetch('https://0x0.st', { method: 'POST', body: form, headers });
        }

        const text = await res.text();
        if (!text || !text.startsWith('http')) return null;
        return text.trim();
    } catch (err) {
        console.log("Fallback upload failed:", err && err.message ? err.message : err);
        return null;
    }
}

// --- PUBLIC EXPORTED FUNCTION ------------------------------------
async function uploadImage(buffer) {
    if (!buffer) throw new Error("No buffer provided");

    let url;

    // Try providers in order of reliability for servers: fallback (0x0.st) -> qu.ax -> telegra.ph
    try {
        console.log('uploadImage: trying fallback (0x0.st)');
        url = await uploadFallback(buffer);
        if (url) return url;
    } catch (e) {
        console.error('uploadImage: fallback failed:', e && e.message ? e.message : e);
    }

    try {
        console.log('uploadImage: trying qu.ax');
        url = await uploadQuax(buffer);
        if (url) return url;
    } catch (e) {
        console.error('uploadImage: qu.ax failed:', e && e.message ? e.message : e);
    }

    try {
        console.log('uploadImage: trying telegra.ph');
        url = await uploadTelegraph(buffer);
        if (url) return url;
    } catch (e) {
        console.error('uploadImage: telegra.ph failed:', e && e.message ? e.message : e);
    }

    // ❌ Everything failed
    throw new Error("Image upload failed");
}

module.exports = { uploadImage };
