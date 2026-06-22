const isAdmin = require('../lib/isAdmin');
const getFakeVcard = require('../lib/fakeVcard');

const { getLang } = require('../lib/lang');
async function openGroupCommand(sock, chatId, senderId, message) {
    console.log(`Attempting to open the group: ${chatId}`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: getLang(sock).common_bot_not_admin }, { quoted: getFakeVcard() });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: getLang(sock).common_user_not_admin }, { quoted: getFakeVcard() });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'not_announcement'); // Open group
        await sock.sendMessage(chatId, { text: getLang(sock).open_success });
    } catch (error) {
        console.error('Error opening group:', error);
        await sock.sendMessage(chatId, { text: getLang(sock).open_failed });
    }
}

module.exports = openGroupCommand;