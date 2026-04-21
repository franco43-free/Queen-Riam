const { setCustomGoodbye, clearCustomGoodbye, getCustomGoodbye } = require('../lib/welcome');
const getFakeVcard = require('../lib/fakeVcard');

const HELP = `⚙️ *Set a custom goodbye message for this group.*

*Placeholders you can use:*
• \`{user}\` → tagged member
• \`{group}\` → group name
• \`{count}\` → remaining member count
• \`{time}\` → leave time
• \`{date}\` → leave date

*Usage:*
• \`.setgoodbye Goodbye {user}! We'll miss you 😢\`
• \`.setgoodbye reset\` → go back to default message`;

async function setGoodbyeCommand(sock, chatId, message) {
    if (!chatId.endsWith('@g.us')) {
        return sock.sendMessage(chatId, { text: '❌ This command can only be used in groups.' }, { quoted: getFakeVcard() });
    }

    const body = message.message?.conversation
        || message.message?.extendedTextMessage?.text
        || '';

    const normalized = body.replace(/\.\s+/g, '.').trim();
    const spaceIdx = normalized.indexOf(' ');
    const arg = spaceIdx !== -1 ? normalized.slice(spaceIdx + 1).trim() : '';

    if (!arg) {
        const current = getCustomGoodbye(chatId);
        const status = current
            ? `*Current custom message:*\n${current}`
            : `_No custom message set — using default._`;
        return sock.sendMessage(chatId, { text: `${status}\n\n${HELP}` }, { quoted: getFakeVcard() });
    }

    if (arg.toLowerCase() === 'reset') {
        clearCustomGoodbye(chatId);
        return sock.sendMessage(chatId, { text: '🔄 Goodbye message reset to default.' }, { quoted: getFakeVcard() });
    }

    setCustomGoodbye(chatId, arg);
    await sock.sendMessage(chatId, {
        text: `✅ *Custom goodbye message saved!*\n\n${arg}\n\n_Placeholders will be filled when a member leaves._`
    }, { quoted: getFakeVcard() });
}

module.exports = setGoodbyeCommand;
