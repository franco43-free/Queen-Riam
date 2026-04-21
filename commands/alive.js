const settings = require("../settings");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { isButtonModeOn, sendButtonMessage } = require("../lib/buttonHelper");
const getFakeVcard = require('../lib/fakeVcard');

function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

async function aliveCommand(sock, chatId, message) {
    try {
        await sock.sendMessage(chatId, { react: { text: "❤️", key: message.key } });

        const userName    = message.pushName || "User";
        const botUptime   = runtime(process.uptime());
        const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const freeMemory  = (os.freemem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMemory  = (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);
        const host        = `${os.platform()} ${os.release()}`;
        const nodeVersion = process.version;

        const platformEmoji = {
            'win32': '🪟', 'darwin': '🍎', 'linux': '🐧', 'android': '🤖'
        }[os.platform()] || '💻';

        const aliveMessage =
            `👋 \`\`\` Hello ${userName}, I'm alive now \`\`\`\n\n` +
            `_*${settings.botName || "Queen Riam"} WhatsApp Bot - Always at your service! 🪄*_\n\n` +
            `📊 *System Status:*\n` +
            `> 🚀 Version: ${settings.version}\n` +
            `> 💾 Memory: ${usedMemory}MB / ${totalMemory}GB\n` +
            `> 🆓 Free: ${freeMemory}GB\n` +
            `> ⏰ Runtime: ${botUptime}\n` +
            `> ${platformEmoji} Platform: ${host}\n` +
            `> 🔧 Node.js: ${nodeVersion}\n\n` +
            `📢 Channel: https://whatsapp.com/channel/0029Va8YUl50bIdtVMYnYd0E\n\n` +
            `*${settings.botName || "Queen Riam"} Online* ✅\n\n` +
            `> ρσωєяє∂ ву ${settings.ownerName || "Héctor Manuel"} 👑`;

        if (isButtonModeOn()) {
            await sendButtonMessage(sock, chatId, {
                text: aliveMessage,
                footer: `${settings.botName || "Queen Riam"} 👑`,
                buttons: [
                    { id: '.ping', text: '🏓 Check Ping' },
                ],
            }, message);
        } else {
            let imageBuffer;
            const imagePath = path.resolve(__dirname, "../media/riam.jpg");
            try {
                if (fs.existsSync(imagePath)) imageBuffer = fs.readFileSync(imagePath);
            } catch (_) {}

            if (imageBuffer) {
                await sock.sendMessage(chatId, { image: imageBuffer, caption: aliveMessage }, { quoted: getFakeVcard() });
            } else {
                await sock.sendMessage(chatId, { text: aliveMessage }, { quoted: getFakeVcard() });
            }
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

    } catch (error) {
        console.error("Error in alive command:", error);
        await sock.sendMessage(chatId, {
            text: `🤖 *${settings.botName || "Queen Riam"} is alive!*\n\nRuntime: ${runtime(process.uptime())}\n\nTry again in a moment! ⚡`
        }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: "⚠️", key: message.key } });
    }
}

module.exports = aliveCommand;
