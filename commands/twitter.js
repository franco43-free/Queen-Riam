const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { downloadTwitter } = require('../lib/media');
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

async function twitterCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation
            || message.message?.extendedTextMessage?.text
            || '';
        let url = text.split(' ').slice(1).join(' ').trim();

        // If no URL inline, try extracting one from the quoted/replied-to message
        if (!url) {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = (
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                ''
            ).trim();
            const match = quotedText.match(/https?:\/\/[^\s]+/);
            if (match) url = match[0];
        }

        if (!url) {
            return await sock.sendMessage(chatId, {
                text: getLang(sock).twitter_no_url
            }, { quoted: getFakeVcard() });
        }

        if (!url.includes('x.com') && !url.includes('twitter.com') && !url.includes('t.co')) {
            return await sock.sendMessage(chatId, {
                text: getLang(sock).twitter_invalid
            }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        const { title, videoUrl, quality } = await downloadTwitter(url);

        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const tempFile = path.join(tmpDir, `twitter_${Date.now()}.mp4`);

        const mediaRes = await axios({
            method: 'GET',
            url: videoUrl,
            responseType: 'stream',
            timeout: 120000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://ssstwitter.com/'
            }
        });

        const writer = fs.createWriteStream(tempFile);
        mediaRes.data.pipe(writer);
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        if (!fs.existsSync(tempFile) || fs.statSync(tempFile).size === 0) {
            throw new Error('Downloaded file is empty');
        }

        await sock.sendMessage(chatId, {
            video: { url: tempFile },
            mimetype: 'video/mp4',
            caption: `*${title}*\n📐 Quality: ${quality}\n\n📥 Downloaded by Queen Riam`
        }, { quoted: getFakeVcard() });

        try { fs.unlinkSync(tempFile); } catch (_) {}

        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[TWITTER] Error:', error.message);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to download the Twitter video.\n\n_${error.message}_`
        }, { quoted: getFakeVcard() });
    }
}

module.exports = twitterCommand;
