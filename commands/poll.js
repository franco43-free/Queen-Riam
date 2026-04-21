const getFakeVcard = require('../lib/fakeVcard');
async function pollCommand(sock, chatId, message, rawQuery, prefix) {
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, {
            text: '❌ Polls can only be created in groups.'
        }, { quoted: getFakeVcard() });
        return;
    }

    // Format: .poll Question? | Option 1 | Option 2 | Option 3
    const parts = rawQuery.split('|').map(p => p.trim()).filter(Boolean);

    if (parts.length < 3) {
        await sock.sendMessage(chatId, {
            text: `📊 *How to create a poll:*\n\n${prefix}poll <question> | option1 | option2 | ...\n\n*Example:*\n${prefix}poll Best fruit? | Apple | Mango | Banana\n\nYou can add up to 12 options.`
        }, { quoted: getFakeVcard() });
        return;
    }

    const question = parts[0];
    const options  = parts.slice(1);

    if (options.length > 12) {
        await sock.sendMessage(chatId, {
            text: '❌ Maximum 12 options allowed per poll.'
        }, { quoted: getFakeVcard() });
        return;
    }

    await sock.sendMessage(chatId, {
        poll: {
            name: question,
            values: options,
            selectableCount: 1
        }
    });
}

module.exports = { pollCommand };
