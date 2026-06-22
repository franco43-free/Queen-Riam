const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');
async function pollCommand(sock, chatId, message, rawQuery, prefix) {
    if (!chatId.endsWith('@g.us')) {
        await sock.sendMessage(chatId, {
            text: getLang(sock).poll_groups_only
        }, { quoted: getFakeVcard() });
        return;
    }

    // Format: .poll Question? | Option 1 | Option 2 | Option 3
    const parts = rawQuery.split('|').map(p => p.trim()).filter(Boolean);

    if (parts.length < 3) {
        await sock.sendMessage(chatId, {
            text: getLang(sock).poll_usage.replace(/\{prefix\}/g, prefix)
        }, { quoted: getFakeVcard() });
        return;
    }

    const question = parts[0];
    const options  = parts.slice(1);

    if (options.length > 12) {
        await sock.sendMessage(chatId, {
            text: getLang(sock).poll_max_options
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
