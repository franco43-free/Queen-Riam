const gTTS = require('gtts');
const fs = require('fs');
const path = require('path');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

async function ttsCommand(sock, chatId, text, message, language = 'en') {
    if (!text) {
        await sock.sendMessage(chatId, { text: getLang(sock).tts_no_text }, { quoted: getFakeVcard() });
        return;
    }

    // React 🔄 while processing
    await sock.sendMessage(chatId, { react: { text: "🔄", key: message.key } });

    const fileName = `tts-${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '..', 'media', fileName);

    const gtts = new gTTS(text, language);
    gtts.save(filePath, async function (err) {
        if (err) {
            console.error("TTS Error:", err);
            await sock.sendMessage(chatId, { text: getLang(sock).tts_error_gen }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            return;
        }

        try {
            // ✅ Read the file after saving
            const audioBuffer = fs.readFileSync(filePath);

            await sock.sendMessage(chatId, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: 'riam.mp3',
                ptt: false
            }, { quoted: getFakeVcard() });

            // React ✅ on success
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
        } catch (e) {
            console.error("Send Error:", e);
            await sock.sendMessage(chatId, { text: getLang(sock).tts_failed_send }, { quoted: getFakeVcard() });
        } finally {
            // 🧹 Clean up temp file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });
}

module.exports = ttsCommand;