const { getLang } = require('../lib/lang');
const { generatePairingCode } = require('../lib/sessionManager');
const getFakeVcard = require('../lib/fakeVcard');
const { isButtonModeOn } = require('../lib/buttonHelper');

let sendButtons;
try {
    sendButtons = require('kango-wa').sendButtons;
} catch (_) {
    sendButtons = null;
}

const channelInfo = {
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363404284793169@newsletter',
            newsletterName: 'Queen Riam',
            serverMessageId: -1
        }
    }
};

async function pairCommand(sock, chatId, message, args) {
    const t = getLang(sock);

    if (!message.key.fromMe) {
        await sock.sendMessage(chatId, { text: t.pair_owner_only, ...channelInfo }, { quoted: getFakeVcard() });
        return;
    }

    const raw = args[0]?.replace(/\D/g, '');

    if (!raw || raw.length < 7 || raw.length > 15) {
        await sock.sendMessage(chatId, { text: t.pair_usage, ...channelInfo }, { quoted: getFakeVcard() });
        return;
    }

    await sock.sendMessage(chatId, {
        text: t.pair_generating.replace('{number}', raw),
        ...channelInfo
    }, { quoted: getFakeVcard() });

    try {
        const code = await generatePairingCode(raw);

        if (!code) {
            await sock.sendMessage(chatId, {
                text: `✅ *+${raw}* is already linked to the bot!`,
                ...channelInfo
            }, { quoted: getFakeVcard() });
            return;
        }

        const response = t.pair_success
            .replace(/\{number\}/g, raw)
            .replace('{code}', code);

        if (isButtonModeOn() && sendButtons) {
            try {
                await sendButtons(sock, chatId, {
                    text: response,
                    footer: '© Queen Riam',
                    buttons: [
                        {
                            name: 'cta_copy',
                            buttonParamsJson: JSON.stringify({
                                display_text: '📋 Copy Code',
                                copy_code: code
                            })
                        }
                    ],
                    quoted: getFakeVcard(),
                    contextInfo: channelInfo.contextInfo
                });
            } catch (_) {
                await sock.sendMessage(chatId, { text: response, ...channelInfo }, { quoted: getFakeVcard() });
            }
        } else {
            await sock.sendMessage(chatId, { text: response, ...channelInfo }, { quoted: getFakeVcard() });
        }

    } catch (err) {
        if (err.message === 'ALREADY_ACTIVE') {
            await sock.sendMessage(chatId, {
                text: t.pair_already_active.replace('{number}', raw),
                ...channelInfo
            }, { quoted: getFakeVcard() });
        } else {
            console.error('Error in pair command:', err);
            await sock.sendMessage(chatId, { text: t.pair_failed, ...channelInfo }, { quoted: getFakeVcard() });
        }
    }
}

module.exports = pairCommand;
