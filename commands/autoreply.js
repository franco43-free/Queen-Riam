const fs   = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const getFakeVcard = require('../lib/fakeVcard');

const { getLang } = require('../lib/lang');
const DATA_DIR    = path.join(process.cwd(), 'data');
function _arConfig(sock){const sid=sock&&sock._sessionNumber?sock._sessionNumber:null;return sid?path.join(DATA_DIR,'autoreply_'+sid+'.json'):path.join(DATA_DIR,'autoreply.json');}
function _arImage(sock){const sid=sock&&sock._sessionNumber?sock._sessionNumber:null;return sid?path.join(DATA_DIR,'autoreply_image_'+sid+'.jpg'):path.join(DATA_DIR,'autoreply_image.jpg');}

const DEFAULT_MSG = "my owners isn't available at the moment you can leave your message";

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadConfig(sock) {
    const CONFIG_FILE = _arConfig(sock);
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaults = { enabled: false, message: DEFAULT_MSG, seenUsers: [] };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2));
        return defaults;
    }
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
    catch { return { enabled: false, message: DEFAULT_MSG, seenUsers: [] }; }
}

function saveConfig(cfg, sock) {
    fs.writeFileSync(_arConfig(sock), JSON.stringify(cfg, null, 2));
}

function hasImage(sock) {
    return fs.existsSync(_arImage(sock));
}

// ─── Apply placeholders ───────────────────────────────────────────────────────
function applyPlaceholders(text, senderName) {
    const now = moment().tz('Africa/Accra');
    return text
        .replace(/\{name\}/g, senderName)
        .replace(/\{time\}/g, now.format('HH:mm:ss'))
        .replace(/\{date\}/g, now.format('DD/MM/YYYY'));
}

// ─── Auto-reply trigger (called from main.js for every DM) ───────────────────
async function handleAutoReply(sock, chatId, message, senderId) {
    const cfg = loadConfig(sock);
    if (!cfg.enabled) return;

    // Only DMs
    if (chatId.endsWith('@g.us') || chatId.endsWith('@newsletter')) return;

    // Don't reply to yourself
    if (message.key.fromMe) return;

    // Only fire on first message from this sender
    if (cfg.seenUsers.includes(senderId)) return;

    // Mark as seen
    cfg.seenUsers.push(senderId);
    saveConfig(cfg, sock);

    // Get sender name
    let senderName = senderId.split('@')[0];
    try {
        const contact = await sock.onWhatsApp(senderId);
        if (contact?.[0]?.notify) senderName = contact[0].notify;
    } catch (_) {}

    const text = applyPlaceholders(cfg.message, senderName);

    if (hasImage(sock)) {
        const imgBuffer = fs.readFileSync(_arImage(sock));
        await sock.sendMessage(chatId, {
            image: imgBuffer,
            caption: text
        }, { quoted: getFakeVcard() });
    } else {
        await sock.sendMessage(chatId, { text }, { quoted: getFakeVcard() });
    }
}

// ─── .autoreply command handler ───────────────────────────────────────────────
async function autoreplyCommand(sock, chatId, message, args, rawQuery) {
    const cfg = loadConfig(sock);
    const sub = args[0]?.toLowerCase();

    // ── .autoreply (status view) ──────────────────────────────────────────────
    if (!sub) {
        const status  = cfg.enabled ? '✅ *ON*' : '❌ *OFF*';
        const imgInfo = hasImage(sock) ? 'attached' : 'none';
        const text =
            `📩 *Auto-Reply Status:* ${status}\n` +
            `🖼️ *Image:* ${imgInfo}\n\n` +
            `*Current message:*\n_${cfg.message}_\n\n` +
            `⚙️ *Auto-Reply Command*\n\n` +
            `Sends a message to anyone who texts you for the *first time*.\n\n` +
            `*Placeholders:*\n` +
            `• \`{name}\` → sender's name\n` +
            `• \`{time}\` → current time\n` +
            `• \`{date}\` → current date\n\n` +
            `*Commands:*\n` +
            `• \`.autoreply set <message>\` → set text\n` +
            `  _Attach/quote an image to include one_\n` +
            `• \`.autoreply removeimage\` → remove attached image\n` +
            `• \`.autoreply reset\` → restore default (removes image too)\n` +
            `• \`.autoreply clear\` → clear seen-users list`;

        const { isButtonModeOn, sendButtonMessage } = require('../lib/buttonHelper');
        if (isButtonModeOn()) {
            await sendButtonMessage(sock, chatId, {
                text,
                footer: 'Queen Riam 👑',
                buttons: [
                    { id: '.autoreply on',  text: getLang(sock).btn_turn_on  },
                    { id: '.autoreply off', text: getLang(sock).btn_turn_off },
                ],
            }, message);
        } else {
            await sock.sendMessage(chatId, { text }, { quoted: getFakeVcard() });
        }
        return;
    }

    // ── .autoreply on ─────────────────────────────────────────────────────────
    if (sub === 'on') {
        cfg.enabled = true;
        saveConfig(cfg, sock);
        await sock.sendMessage(chatId, { text: getLang(sock).autoreply_on }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply off ────────────────────────────────────────────────────────
    if (sub === 'off') {
        cfg.enabled = false;
        saveConfig(cfg, sock);
        await sock.sendMessage(chatId, { text: getLang(sock).autoreply_off }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply clear ──────────────────────────────────────────────────────
    if (sub === 'clear') {
        cfg.seenUsers = [];
        saveConfig(cfg, sock);
        await sock.sendMessage(chatId, { text: getLang(sock).autoreply_cleared }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply reset ──────────────────────────────────────────────────────
    if (sub === 'reset') {
        cfg.message = DEFAULT_MSG;
        saveConfig(cfg, sock);
        if (hasImage(sock)) fs.unlinkSync(_arImage(sock));
        await sock.sendMessage(chatId, { text: getLang(sock).autoreply_reset }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply removeimage ────────────────────────────────────────────────
    if (sub === 'removeimage') {
        if (hasImage(sock)) {
            fs.unlinkSync(_arImage(sock));
            await sock.sendMessage(chatId, { text: getLang(sock).autoreply_image_removed }, { quoted: getFakeVcard() });
        } else {
            await sock.sendMessage(chatId, { text: getLang(sock).autoreply_no_image }, { quoted: getFakeVcard() });
        }
        return;
    }

    // ── .autoreply set <message> ──────────────────────────────────────────────
    if (sub === 'set') {
        const newMsg = rawQuery.slice(3).trim(); // slice off "set"
        if (!newMsg) {
            await sock.sendMessage(chatId, { text: getLang(sock).autoreply_usage_set }, { quoted: getFakeVcard() });
            return;
        }

        cfg.message = newMsg;
        saveConfig(cfg, sock);

        // Check for attached image (sent with the command)
        const imgMsg =
            message.message?.imageMessage ||
            message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        if (imgMsg) {
            try {
                const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
                const stream = await downloadContentFromMessage(imgMsg, 'image');
                let buf = Buffer.from([]);
                for await (const chunk of stream) buf = Buffer.concat([buf, chunk]);
                fs.writeFileSync(_arImage(sock), buf);
                await sock.sendMessage(chatId, { text: getLang(sock).autoreply_set_with_image.replace('{msg}', newMsg) }, { quoted: getFakeVcard() });
            } catch (err) {
                await sock.sendMessage(chatId, { text: getLang(sock).autoreply_set_image_failed.replace('{msg}', newMsg) }, { quoted: getFakeVcard() });
            }
        } else {
            await sock.sendMessage(chatId, { text: getLang(sock).autoreply_set_success.replace('{msg}', newMsg) }, { quoted: getFakeVcard() });
        }
        return;
    }

    // Unknown subcommand
    await sock.sendMessage(chatId, {
        text: getLang(sock).autoreply_unknown
    }, { quoted: getFakeVcard() });
}

module.exports = { autoreplyCommand, handleAutoReply };
