const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function (sock, chatId, message) {
    try {
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: { Accept: 'application/json' }
        });
        const joke = response.data.joke;
        const text = `🤣 *Joke of Today* 🤣\n\n${joke}`;

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.joke',  text: '😂 Another Joke' },
                { id: '.fact',  text: '🧠 Random Fact'  },
                { id: '.quote', text: '💡 Daily Quote'  },
            ],
        }, message);

    } catch (error) {
        console.error('Error fetching joke:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Sorry, I could not fetch a joke right now.'
        }, { quoted: getFakeVcard() });
    }
};
