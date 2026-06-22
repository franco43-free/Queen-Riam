const isAdmin = require('../lib/isAdmin');
const getFakeVcard = require('../lib/fakeVcard');

const { getLang } = require('../lib/lang');
async function closeGroupCommand(sock, chatId, senderId, message) {
    console.log(`Attempting to close the group: ${chatId}`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: getLang(sock).common_bot_not_admin }, { quoted: getFakeVcard() });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: getLang(sock).common_user_not_admin }, { quoted: getFakeVcard() });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Close group
        await sock.sendMessage(chatId, { text: getLang(sock).close_success });
    } catch (error) {
        console.error('Error closing group:', error);
        await sock.sendMessage(chatId, { text: getLang(sock).close_failed });
    }
}

module.exports = closeGroupCommand;