const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36';
const BASE_URL = 'https://talknotes.io';
const API_URL = 'https://api.talknotes.io';

let cachedApiKey = null;
let keyExpiry = 0;

async function getApiKey() {
    if (cachedApiKey && Date.now() < keyExpiry) return cachedApiKey;
    const res = await axios.get(`${BASE_URL}/tools/transcribe-to-text`, {
        headers: { 'user-agent': USER_AGENT },
        timeout: 15000,
    });
    const $ = cheerio.load(res.data);
    let key = null;
    $('script').each((_, el) => {
        const script = $(el).html();
        const match = script?.match(/toolsApiKey:\s*"([a-f0-9\-]+)"/i);
        if (match) { key = match[1]; return false; }
    });
    if (!key) throw new Error('Could not get transcription API key');
    cachedApiKey = key;
    keyExpiry = Date.now() + 30 * 60 * 1000;
    return key;
}

async function transcribeFile(filePath) {
    const apiKey = await getApiKey();
    const timestamp = Date.now();
    const hmac = crypto.createHmac('sha256', apiKey);
    hmac.update(timestamp.toString());
    const token = hmac.digest('hex');

    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));

    const res = await axios.post(`${API_URL}/tools/converter`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': USER_AGENT,
            'origin': BASE_URL,
            'referer': `${BASE_URL}/`,
            'x-timestamp': timestamp,
            'x-token': token,
        },
        timeout: 60000,
    });
    return res.data;
}

async function transcribeCommand(sock, chatId, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const audioMsg = quoted?.audioMessage
        || quoted?.videoMessage
        || message.message?.audioMessage
        || message.message?.videoMessage;

    if (!audioMsg) {
        await sock.sendMessage(chatId, {
            text: getLang(sock).transcribe_no_audio,
        }, { quoted: getFakeVcard() });
        return;
    }

    await sock.sendMessage(chatId, { react: { text: '🎙️', key: message.key } });
    await sock.sendPresenceUpdate('composing', chatId);

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `transcribe_${Date.now()}.ogg`);

    try {
        const quotedMsg = {
            key: {
                remoteJid: chatId,
                id: message.message?.extendedTextMessage?.contextInfo?.stanzaId,
                fromMe: false,
                participant: message.message?.extendedTextMessage?.contextInfo?.participant,
            },
            message: quoted,
        };

        const buffer = await downloadMediaMessage(quotedMsg, 'buffer', {});
        fs.writeFileSync(tmpFile, buffer);

        const result = await transcribeFile(tmpFile);

        if (result?.text || result?.transcript) {
            const text = result.text || result.transcript;
            await sock.sendMessage(chatId, {
                text: getLang(sock).transcribe_header + '\n\n' + text,
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else if (typeof result === 'string' && result.length > 0) {
            await sock.sendMessage(chatId, {
                text: getLang(sock).transcribe_header + '\n\n' + result,
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
        } else {
            await sock.sendMessage(chatId, {
                text: getLang(sock).transcribe_unclear,
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        }
    } catch (err) {
        console.error('[TRANSCRIBE] Error:', err.message);
        await sock.sendMessage(chatId, {
            text: getLang(sock).transcribe_failed + ' ' + err.message,
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        await sock.sendPresenceUpdate('paused', chatId);
    }
}

module.exports = transcribeCommand;
