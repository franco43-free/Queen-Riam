const isAdmin = require('../lib/isAdmin');
const getFakeVcard = require('../lib/fakeVcard');

async function closeGroupCommand(sock, chatId, senderId, message) {
    console.log(`Attempting to close the group: ${chatId}`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: '⚠️ Please make the bot an *admin* first.' }, { quoted: getFakeVcard() });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: '❌ Only group admins can use the *close group* command.' }, { quoted: getFakeVcard() });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'announcement'); // Close group
        await sock.sendMessage(chatId, { text: '🔒 The group has been *closed*.\nOnly admins can send messages now.' });
    } catch (error) {
        console.error('Error closing group:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to close the group.' });
    }
}

module.exports = closeGroupCommand;