const yts = require('yt-search');
const { getAudio } = require('../lib/media');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: getLang(sock).dl_no_song
            }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, { react: { text: '🔍', key: message.key } });

        const { videos } = await yts(searchQuery);
        if (!videos || videos.length === 0) {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(chatId, { text: getLang(sock).dl_no_results }, { quoted: getFakeVcard() });
        }

        const video = videos[0];

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });
        await sock.sendMessage(chatId, {
            image: { url: video.thumbnail },
            caption: `🎵 *${video.title}*\n\n${getLang(sock).dl_downloading} 🎶\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʀɪᴀᴍ`
        }, { quoted: getFakeVcard() });

        await sock.sendMessage(chatId, { react: { text: '📥', key: message.key } });
        const { buffer, title } = await getAudio(video.url);

        await sock.sendMessage(chatId, { react: { text: '🎶', key: message.key } });
        await sock.sendMessage(chatId, {
            audio: buffer,
            mimetype: 'audio/mpeg',
            fileName: `${title || video.title}.mp3`,
            ptt: false
        }, { quoted: getFakeVcard() });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

    } catch (error) {
        console.error('Error in songCommand:', error.message);
        if (error.message?.includes('Connection Closed') || error.message?.includes('Connection Terminated')) return;
        try {
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(chatId, { text: getLang(sock).dl_failed }, { quoted: getFakeVcard() });
        } catch (_) {}
    }
}

module.exports = songCommand;
