const { sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

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
            text: getLang(sock).eightball_no_question
        }, { quoted: getFakeVcard() });
        return;
    }

    const answer = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    const text   = `${getLang(sock).eightball_title}\n\n${getLang(sock).eightball_question_label} ${question}\n\n${getLang(sock).eightball_answer_label} ${answer}`;

    await sendButtonMessage(sock, chatId, {
        text,
        footer: 'Queen Riam 👑',
        buttons: [
            { id: `.8ball ${question}`, text: getLang(sock).eightball_btn_again },
        ],
    }, message);
}

module.exports = { eightBallCommand };
