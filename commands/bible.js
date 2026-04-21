const axios = require('axios');

module.exports = async function bibleCommand(sock, chatId, message, query) {
    try {
        if (!query) {
            await sock.sendMessage(chatId, { text: "📖 Usage: .bible John 3:16" });
            return;
        }

        const url = `https://hector-bible-api.officialhectormanuel.workers.dev/?q=${encodeURIComponent(query)}`;
        const res = await axios.get(url);

        if (!res.data.status) {
            await sock.sendMessage(chatId, { text: "❌ Could not fetch the verse. Please check the reference." });
            return;
        }

        const { reference, translation, text } = res.data;

        const reply = `📖 *${reference}* (${translation})\n\n${text.trim()}`;
        await sock.sendMessage(chatId, { text: reply });

    } catch (err) {
        await sock.sendMessage(chatId, { text: "⚠️ Error fetching verse. Try again later." });
        console.error("Bible command error:", err.message);
    }
};
