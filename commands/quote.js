const fetch = require('node-fetch');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function quoteCommand(sock, chatId, message) {
    try {
        const res = await fetch(`https://quotes-api.officialhectormanuel.workers.dev/?type=random`);
        if (!res.ok) throw await res.text();

        const json    = await res.json();
        let quoteText = json?.quote?.text || "Couldn't fetch a quote right now.";
        const author  = json?.quote?.author || "Unknown";
        quoteText     = quoteText.replace(/\(variation \d+\)/gi, "").trim();
        const text    = `💡 *Quote of the Day* 💡\n\n"${quoteText}"\n\n✍️ — *${author}*`;

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.quote', text: '💡 Another Quote' },
                { id: '.joke',  text: '😂 Get a Joke'   },
                { id: '.fact',  text: '🧠 Random Fact'  },
            ],
        }, message);

    } catch (error) {
        console.error('Error in quote command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Failed to get quote. Please try again later!'
        }, { quoted: getFakeVcard() });
    }
};
