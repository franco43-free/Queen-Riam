const axios = require('axios');
const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

module.exports = async function (sock, chatId, message) {
    try {
        const apiKey   = 'dcd720a6f1914e2d9dba9790c188c08c';
        const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}`);
        const articles = response.data.articles.slice(0, 5);

        let text = '📰 *Latest News*:\n\n';
        articles.forEach((article, index) => {
            text += `${index + 1}. *${article.title}*\n${article.description || ''}\n\n`;
        });
        text += '🌐 More: https://www.bbc.com/news';

        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.news', text: '🔄 Refresh News' },
            ],
        }, message);

    } catch (error) {
        console.error('Error fetching news:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Sorry, I could not fetch news right now.'
        }, { quoted: getFakeVcard() });
    }
};
