const { getLang } = require('../lib/lang');
async function unmuteCommand(sock, chatId) {
    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
    await sock.sendMessage(chatId, { text: getLang(sock).mute_unmuted });
}

module.exports = unmuteCommand;
