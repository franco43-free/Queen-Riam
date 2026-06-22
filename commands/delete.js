const isAdmin = require('../lib/isAdmin');
const { getLang } = require('../lib/lang');

async function deleteCommand(sock, chatId, message, senderId) {
    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        await sock.sendMessage(chatId, { text: getLang(sock).delete_bot_admin });
        return;
    }

    if (!isSenderAdmin) {
        await sock.sendMessage(chatId, { text: getLang(sock).delete_user_admin });
        return;
    }

    const quotedMessage = message.message?.extendedTextMessage?.contextInfo?.stanzaId;
    const quotedParticipant = message.message?.extendedTextMessage?.contextInfo?.participant;

    if (quotedMessage) {
        await sock.sendMessage(chatId, { delete: { remoteJid: chatId, fromMe: false, id: quotedMessage, participant: quotedParticipant } });
    } else {
        await sock.sendMessage(chatId, { text: getLang(sock).delete_no_reply });
    }
}

module.exports = deleteCommand;
