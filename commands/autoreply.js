const fs   = require('fs');
const path = require('path');
const moment = require('moment-timezone');
const getFakeVcard = require('../lib/fakeVcard');

const DATA_DIR    = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'autoreply.json');
const IMAGE_FILE  = path.join(DATA_DIR, 'autoreply_image.jpg');

const DEFAULT_MSG = "my owners isn't available at the moment you can leave your message";

// ─── Storage helpers ──────────────────────────────────────────────────────────
function loadConfig() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(CONFIG_FILE)) {
        const defaults = { enabled: false, message: DEFAULT_MSG, seenUsers: [] };
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2));
        return defaults;
    }
    try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); }
    catch { return { enabled: false, message: DEFAULT_MSG, seenUsers: [] }; }
}

function saveConfig(cfg) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function hasImage() {
    return fs.existsSync(IMAGE_FILE);
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
    const cfg = loadConfig();
    if (!cfg.enabled) return;

    // Only DMs
    if (chatId.endsWith('@g.us') || chatId.endsWith('@newsletter')) return;

    // Don't reply to yourself
    if (message.key.fromMe) return;

    // Only fire on first message from this sender
    if (cfg.seenUsers.includes(senderId)) return;

    // Mark as seen
    cfg.seenUsers.push(senderId);
    saveConfig(cfg);

    // Get sender name
    let senderName = senderId.split('@')[0];
    try {
        const contact = await sock.onWhatsApp(senderId);
        if (contact?.[0]?.notify) senderName = contact[0].notify;
    } catch (_) {}

    const text = applyPlaceholders(cfg.message, senderName);

    if (hasImage()) {
        const imgBuffer = fs.readFileSync(IMAGE_FILE);
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
    const cfg = loadConfig();
    const sub = args[0]?.toLowerCase();

    // ── .autoreply (status view) ──────────────────────────────────────────────
    if (!sub) {
        const status  = cfg.enabled ? '✅ *ON*' : '❌ *OFF*';
        const imgInfo = hasImage() ? 'attached' : 'none';
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
                    { id: '.autoreply on',  text: '✅ Enable'  },
                    { id: '.autoreply off', text: '❌ Disable' },
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
        saveConfig(cfg);
        await sock.sendMessage(chatId, { text: '✅ Auto-reply is now *ON*.' }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply off ────────────────────────────────────────────────────────
    if (sub === 'off') {
        cfg.enabled = false;
        saveConfig(cfg);
        await sock.sendMessage(chatId, { text: '❌ Auto-reply is now *OFF*.' }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply clear ──────────────────────────────────────────────────────
    if (sub === 'clear') {
        cfg.seenUsers = [];
        saveConfig(cfg);
        await sock.sendMessage(chatId, { text: '🧹 Seen-users list cleared. Everyone will get the auto-reply again.' }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply reset ──────────────────────────────────────────────────────
    if (sub === 'reset') {
        cfg.message = DEFAULT_MSG;
        saveConfig(cfg);
        if (hasImage()) fs.unlinkSync(IMAGE_FILE);
        await sock.sendMessage(chatId, { text: '🔄 Auto-reply reset to default message and image removed.' }, { quoted: getFakeVcard() });
        return;
    }

    // ── .autoreply removeimage ────────────────────────────────────────────────
    if (sub === 'removeimage') {
        if (hasImage()) {
            fs.unlinkSync(IMAGE_FILE);
            await sock.sendMessage(chatId, { text: '🗑️ Auto-reply image removed.' }, { quoted: getFakeVcard() });
        } else {
            await sock.sendMessage(chatId, { text: '⚠️ No image is currently set.' }, { quoted: getFakeVcard() });
        }
        return;
    }

    // ── .autoreply set <message> ──────────────────────────────────────────────
    if (sub === 'set') {
        const newMsg = rawQuery.slice(3).trim(); // slice off "set"
        if (!newMsg) {
            await sock.sendMessage(chatId, { text: `Usage: .autoreply set <message>\nYou can attach or quote an image too.` }, { quoted: getFakeVcard() });
            return;
        }

        cfg.message = newMsg;
        saveConfig(cfg);

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
                fs.writeFileSync(IMAGE_FILE, buf);
                await sock.sendMessage(chatId, { text: `✅ Auto-reply message and image updated.\n\n*Message:* _${newMsg}_` }, { quoted: getFakeVcard() });
            } catch (err) {
                await sock.sendMessage(chatId, { text: `✅ Auto-reply message updated (image failed to save).\n\n*Message:* _${newMsg}_` }, { quoted: getFakeVcard() });
            }
        } else {
            await sock.sendMessage(chatId, { text: `✅ Auto-reply message updated.\n\n*Message:* _${newMsg}_` }, { quoted: getFakeVcard() });
        }
        return;
    }

    // Unknown subcommand
    await sock.sendMessage(chatId, {
        text: `❓ Unknown option. Send *.autoreply* to see all commands.`
    }, { quoted: getFakeVcard() });
}

module.exports = { autoreplyCommand, handleAutoReply };
