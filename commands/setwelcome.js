const { setCustomWelcome, clearCustomWelcome, getCustomWelcome } = require('../lib/welcome');
const getFakeVcard = require('../lib/fakeVcard');

const HELP = `⚙️ *Set a custom welcome message for this group.*

*Placeholders you can use:*
• \`{user}\` → tagged member
• \`{group}\` → group name
• \`{count}\` → total member count
• \`{time}\` → join time
• \`{date}\` → join date

*Usage:*
• \`.setwelcome Hello {user}! Welcome to {group} 🎉\`
• \`.setwelcome reset\` → go back to default message`;

async function setWelcomeCommand(sock, chatId, message) {
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
        const current = getCustomWelcome(chatId);
        const status = current
            ? `*Current custom message:*\n${current}`
            : `_No custom message set — using default._`;
        return sock.sendMessage(chatId, { text: `${status}\n\n${HELP}` }, { quoted: getFakeVcard() });
    }

    if (arg.toLowerCase() === 'reset') {
        clearCustomWelcome(chatId);
        return sock.sendMessage(chatId, { text: '🔄 Welcome message reset to default.' }, { quoted: getFakeVcard() });
    }

    setCustomWelcome(chatId, arg);
    await sock.sendMessage(chatId, {
        text: `✅ *Custom welcome message saved!*\n\n${arg}\n\n_Placeholders will be filled when a member joins._`
    }, { quoted: getFakeVcard() });
}

module.exports = setWelcomeCommand;
