const axios = require('axios');
const { getLang } = require('../lib/lang');

module.exports = async function bibleCommand(sock, chatId, message, query) {
    try {
        if (!query) {
            await sock.sendMessage(chatId, { text: getLang(sock).bible_usage });
            return;
        }

        const url = `https://hector-bible-api.officialhectormanuel.workers.dev/?q=${encodeURIComponent(query)}`;
        const res = await axios.get(url);

        if (!res.data.status) {
            await sock.sendMessage(chatId, { text: getLang(sock).bible_not_found });
            return;
        }

        const { reference, translation, text } = res.data;

        const reply = `📖 *${reference}* (${translation})\n\n${text.trim()}`;
        await sock.sendMessage(chatId, { text: reply });

    } catch (err) {
        await sock.sendMessage(chatId, { text: getLang(sock).bible_error });
        console.error("Bible command error:", err.message);
    }
};
