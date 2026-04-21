const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { getVideo } = require('../lib/media');
const getFakeVcard = require('../lib/fakeVcard');

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();

        if (!searchQuery) {
            return await sock.sendMessage(chatId, { text: 'What video do you want to download?' }, { quoted: getFakeVcard() });
        }

        let ytUrl = '';
        let previewTitle = '';
        let previewThumbnail = '';

        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            ytUrl = searchQuery;
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                return await sock.sendMessage(chatId, { text: 'No videos found!' }, { quoted: getFakeVcard() });
            }
            ytUrl = videos[0].url;
            previewTitle = videos[0].title;
            previewThumbnail = videos[0].thumbnail;
        }

        const urlMatch = ytUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{11})/);
        if (!urlMatch) {
            return await sock.sendMessage(chatId, { text: 'This is not a valid YouTube link!' }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const { fileUrl, title, thumbnail } = await getVideo(ytUrl, '360p');

        const finalTitle = title || previewTitle || 'video';
        const finalThumb = thumbnail || previewThumbnail;
        const filename = `${finalTitle.replace(/[^a-zA-Z0-9-_\.]/g, '_')}.mp4`;

        await sock.sendMessage(chatId, {
            image: { url: finalThumb },
            caption: `🎬 *${finalTitle}*\n📌 Quality: 360p\n\n> _Downloading your video..._`
        }, { quoted: getFakeVcard() });

        // Try sending directly from URL first
        try {
            await sock.sendMessage(chatId, {
                video: { url: fileUrl },
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${finalTitle}*\n📌 Quality: 360p\n\n> *_Downloaded by Queen Riam_*`
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
            return;
        } catch (directErr) {
            console.log('[video.js] Direct send failed, buffering:', directErr.message);
        }

        // Fallback: download to temp file
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const tempFile = path.join(tempDir, `${Date.now()}.mp4`);

        try {
            const videoRes = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 120000, headers: { 'User-Agent': 'Mozilla/5.0' } });
            fs.writeFileSync(tempFile, Buffer.from(videoRes.data));

            const stats = fs.statSync(tempFile);
            if (stats.size > 62 * 1024 * 1024) {
                return await sock.sendMessage(chatId, { text: 'Video is too large to send on WhatsApp (max 62MB).' }, { quoted: getFakeVcard() });
            }

            await sock.sendMessage(chatId, {
                video: fs.readFileSync(tempFile),
                mimetype: 'video/mp4',
                fileName: filename,
                caption: `*${finalTitle}*\n📌 Quality: 360p\n\n> *_Downloaded by Queen Riam_*`
            }, { quoted: getFakeVcard() });
            await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });

        } finally {
            setTimeout(() => { try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch {} }, 5000);
        }

    } catch (error) {
        console.error('[video.js] Error:', error.message);
        await sock.sendMessage(chatId, { text: '❌ Download failed. Please try again later.' }, { quoted: getFakeVcard() });
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
    }
}

module.exports = videoCommand;
