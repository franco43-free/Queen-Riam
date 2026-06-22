const { getPinterestVideo, isValidPinterestUrl } = require('../lib/pinterestDownloader');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

async function pinterestCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        let url = text.split(' ').slice(1).join(' ').trim();

        if (!url) {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                ''
            ).trim();
        }

        if (!url) {
            return await sock.sendMessage(chatId, {
                text: getLang(sock).pinterest_no_url
            }, { quoted: getFakeVcard() });
        }

        if (!isValidPinterestUrl(url)) {
            return await sock.sendMessage(chatId, {
                text: getLang(sock).pinterest_invalid
            }, { quoted: getFakeVcard() });
        }

        const data = await getPinterestVideo(url);

        if (!data.status) {
            return await sock.sendMessage(chatId, {
                text: `❌ ${data.error}`
            }, { quoted: getFakeVcard() });
        }

        if (data.thumbnail) {
            await sock.sendMessage(chatId, {
                image: { url: data.thumbnail },
                caption: `📌 *${data.title}*\n\n𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜... 🎬\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʀɪᴀᴍ`
            }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, {
            video: { url: data.downloadUrl },
            mimetype: 'video/mp4',
            caption: `📌 *${data.title}* | ${data.quality}\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʀɪᴀᴍ`
        }, { quoted: getFakeVcard() });

    } catch (err) {
        console.error('Pinterest command error:', err.message);
        await sock.sendMessage(chatId, {
            text: '❌ Download failed. Please try again later.'
        }, { quoted: getFakeVcard() });
    }
}

module.exports = pinterestCommand;
