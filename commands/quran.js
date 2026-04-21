const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function quranCommand(sock, chatId, message, query) {
    try {
        if (!query) {
            await sock.sendMessage(chatId, { text: "📖 Usage: .quran <surah>:<ayah>\nExample: .quran 1:1 or .quran 2:255" });
            return;
        }

        const parts = query.includes(':') ? query.split(':') : query.trim().split(/\s+/);
        const surah = parseInt(parts[0]);
        const ayah = parseInt(parts[1]);

        if (!surah || !ayah || isNaN(surah) || isNaN(ayah)) {
            await sock.sendMessage(chatId, { text: "❌ Invalid format. Use .quran <surah>:<ayah>\nExample: .quran 2:255" });
            return;
        }

        const url = `https://quran-api.officialhectormanuel.workers.dev/?s=${surah}&a=${ayah}`;
        const res = await axios.get(url);

        if (!res.data.status) {
            await sock.sendMessage(chatId, { text: "❌ Could not fetch the verse. Please check the surah and ayah number." });
            return;
        }

        const { arabic, english, audio } = res.data;

        const reply =
            `🕌 *Surah ${surah}, Ayah ${ayah}*\n\n` +
            `*Arabic:*\n${arabic}\n\n` +
            `*English:*\n${english}`;

        await sock.sendMessage(chatId, { text: reply });

        await sock.sendMessage(chatId, {
            audio: { url: audio },
            mimetype: "audio/mp4",
            ptt: true
        }, { quoted: getFakeVcard() });

    } catch (err) {
        await sock.sendMessage(chatId, { text: "⚠️ Error fetching verse. Try again later." });
        console.error("Quran command error:", err.message);
    }
};
