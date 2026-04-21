const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function (sock, chatId, message) {
    try {
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        const text     = `🧠 *Random Fact* 🧠\n\n${response.data.text}`;

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.fact',  text: '🧠 Another Fact' },
                { id: '.quote', text: '💡 Daily Quote'  },
                { id: '.joke',  text: '😂 Get a Joke'   },
            ],
        }, message);

    } catch (error) {
        console.error('Error fetching fact:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Sorry, I could not fetch a fact right now.'
        }, { quoted: getFakeVcard() });
    }
};
