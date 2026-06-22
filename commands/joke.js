const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

module.exports = async function (sock, chatId, message) {
    try {
        const response = await axios.get('https://icanhazdadjoke.com/', {
            headers: { Accept: 'application/json' }
        });
        const joke = response.data.joke;
        const text = `${getLang(sock).joke_title}${joke}`;

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.joke',  text: getLang(sock).joke_btn_another },
                { id: '.fact',  text: '🧠 Random Fact'  },
                { id: '.quote', text: getLang(sock).joke_btn_quote  },
            ],
        }, message);

    } catch (error) {
        console.error('Error fetching joke:', error);
        await sock.sendMessage(chatId, {
            text: getLang(sock).joke_error
        }, { quoted: getFakeVcard() });
    }
};
