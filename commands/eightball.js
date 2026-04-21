const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');

const eightBallResponses = [
    "Yes, definitely!",
    "No way!",
    "Ask again later.",
    "It is certain.",
    "Very doubtful.",
    "Without a doubt.",
    "My reply is no.",
    "Signs point to yes."
];

async function eightBallCommand(sock, chatId, question, message) {
    if (!question) {
        await sock.sendMessage(chatId, {
            text: '🎱 Please ask a question!\n\nUsage: `.8ball <your question>`'
        }, { quoted: getFakeVcard() });
        return;
    }

    const answer = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    const text   = `🎱 *Magic 8-Ball*\n\n❓ *Question:* ${question}\n\n💬 *Answer:* ${answer}`;

    await sendButtonMessage(sock, chatId, {
        text,
        footer: 'Queen Riam 👑',
        buttons: [
            { id: `.8ball ${question}`, text: '🔄 Ask Again' },
        ],
    }, message);
}

module.exports = { eightBallCommand };
