const isAdmin = require('../lib/isAdmin');
const getFakeVcard = require('../lib/fakeVcard');

async function openGroupCommand(sock, chatId, senderId, message) {
    console.log(`Attempting to open the group: ${chatId}`);

    const { isSenderAdmin, isBotAdmin } = await isAdmin(sock, chatId, senderId);

    if (!isBotAdmin) {
        return sock.sendMessage(chatId, { text: '⚠️ Please make the bot an *admin* first.' }, { quoted: getFakeVcard() });
    }

    if (!isSenderAdmin) {
        return sock.sendMessage(chatId, { text: '❌ Only group admins can use the *open group* command.' }, { quoted: getFakeVcard() });
    }

    try {
        await sock.groupSettingUpdate(chatId, 'not_announcement'); // Open group
        await sock.sendMessage(chatId, { text: '🔓 The group has been *opened*.\nAll members can send messages now.' });
    } catch (error) {
        console.error('Error opening group:', error);
        await sock.sendMessage(chatId, { text: '❌ Failed to open the group.' });
    }
}

module.exports = openGroupCommand;