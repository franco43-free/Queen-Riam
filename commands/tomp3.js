const { toMp3 } = require("../lib/mp3converter");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Buffer } = require("buffer");
const getFakeVcard = require('../lib/fakeVcard');

async function tomp3Command(sock, chatId, message) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted?.videoMessage) {
        await sock.sendMessage(chatId, {
            react: { text: "❌", key: message.key }
        });
        await sock.sendMessage(chatId, { text: "❌ Please *reply to a video* with .tomp3" }, { quoted: getFakeVcard() });
        return;
    }

    try {
        // React: in progress
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        // Download video
        const stream = await downloadContentFromMessage(quoted.videoMessage, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        // Convert to MP3
        const audio = await toMp3(buffer, "mp4");

        // Send back as audio
        await sock.sendMessage(chatId, {
            audio: audio.data,
            mimetype: "audio/mpeg",
            ptt: false
        }, { quoted: getFakeVcard() });

        // React: success
        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

        // Cleanup
        await audio.delete?.();

    } catch (err) {
        console.error("tomp3 error:", err);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, { text: "❌ Failed to convert video to MP3." }, { quoted: getFakeVcard() });
    }
}

module.exports = tomp3Command;