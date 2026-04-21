const axios = require('axios');
const { isButtonModeOn, sendButtonMessage } = require('../lib/buttonHelper');
const getFakeVcard = require('../lib/fakeVcard');
let sendButtons;
try {
    sendButtons = require('kango-wa').sendButtons;
} catch (_) {
    sendButtons = null;
}

let triviaGames = {};

function decodeHTML(text) {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&eacute;/g, 'é')
        .replace(/&ouml;/g, 'ö')
        .replace(/&uuml;/g, 'ü')
        .replace(/&ntilde;/g, 'ñ')
        .replace(/&lrm;/g, '')
        .replace(/&rlm;/g, '')
        .replace(/&#\d+;/g, m => String.fromCharCode(m.match(/\d+/)[0]));
}

async function startTrivia(sock, chatId, message) {
    if (triviaGames[chatId]) {
        await sock.sendMessage(chatId, { text: '⚠️ A trivia game is already in progress!\n\nUse `.answer <your answer>` to respond.' });
        return;
    }

    try {
        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const q = response.data.results[0];

        const question = decodeHTML(q.question);
        const correct  = decodeHTML(q.correct_answer);
        const options  = [...q.incorrect_answers.map(decodeHTML), correct].sort();

        const labels = ['A', 'B', 'C', 'D'];

        triviaGames[chatId] = {
            question,
            correctAnswer: correct,
            options,
        };

        const diffEmoji = { easy: '🟢', medium: '🟡', hard: '🔴' }[q.difficulty] || '⚪';
        const text =
            `🧠 *Trivia Time!*\n\n` +
            `📂 *Category:* ${decodeHTML(q.category)}\n` +
            `${diffEmoji} *Difficulty:* ${q.difficulty}\n\n` +
            `❓ *${question}*\n\n` +
            options.map((opt, i) => `*${labels[i]}.* ${opt}`).join('\n');

        if (isButtonModeOn() && sendButtons) {
            try {
                const buttons = options.map((opt, i) => ({
                    id: `.answer ${opt}`,
                    text: `${labels[i]}. ${opt}`,
                }));
                await sendButtons(sock, chatId, {
                    text,
                    footer: 'Queen Riam 👑 — Tap your answer!',
                    buttons,
                    quoted: getFakeVcard(),
                });
            } catch (_) {
                await sock.sendMessage(chatId, {
                    text: text + '\n\n_Reply with_ `.answer <your answer>`',
                }, message ? { quoted: getFakeVcard() } : {});
            }
        } else {
            await sock.sendMessage(chatId, {
                text: text + '\n\n_Reply with_ `.answer <your answer>`',
            }, message ? { quoted: getFakeVcard() } : {});
        }

    } catch (error) {
        console.error('Trivia error:', error);
        await sock.sendMessage(chatId, { text: '❌ Error fetching trivia question. Try again later.' });
    }
}

async function answerTrivia(sock, chatId, answer, message) {
    if (!triviaGames[chatId]) {
        await sock.sendMessage(chatId, { text: '⚠️ No trivia game in progress.\n\nStart one with `.trivia`' });
        return;
    }

    const game = triviaGames[chatId];
    delete triviaGames[chatId];

    const isCorrect = answer.toLowerCase().trim() === game.correctAnswer.toLowerCase().trim();

    let text;
    if (isCorrect) {
        text = `✅ *Correct!*\n\nThe answer is *${game.correctAnswer}* 🎉`;
    } else {
        text = `❌ *Wrong!*\n\nYou said: _${answer}_\nCorrect answer: *${game.correctAnswer}*`;
    }

    if (isButtonModeOn()) {
        await sendButtonMessage(sock, chatId, {
            text,
            footer: 'Queen Riam 👑',
            buttons: [
                { id: '.trivia', text: '🧠 Next Question' },
            ],
        }, message);
    } else {
        await sock.sendMessage(chatId, { text }, message ? { quoted: getFakeVcard() } : {});
    }
}

module.exports = { startTrivia, answerTrivia };
