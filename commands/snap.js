const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { downloadSnapchat } = require('../lib/media');
const getFakeVcard = require('../lib/fakeVcard');

async function snapCommand(sock, chatId, message) {
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
                text: '❌ Please provide a Snapchat link, or reply to a message containing one.\n\nExample: *.snap https://www.snapchat.com/spotlight/...*'
            }, { quoted: getFakeVcard() });
        }

        if (!url.includes('snapchat.com') && !url.includes('snap.com')) {
            return await sock.sendMessage(chatId, {
                text: '❌ That does not look like a Snapchat link.'
            }, { quoted: getFakeVcard() });
        }

        // Loading reaction
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        // Fetch Snapchat media info via snapmate.io
        const data = await downloadSnapchat(url);
        const { username, type, mediaType, urls } = data;

        if (!urls.length) {
            return await sock.sendMessage(chatId, {
                text: '❌ No downloadable content found. The snap may be private or the link may be expired.'
            }, { quoted: getFakeVcard() });
        }

        const caption = `*${type}* by *${username}*\n\n📥 Downloaded by Queen Riam`;
        const tmpDir = path.join(process.cwd(), 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        // Download and send each media item (most snaps have 1, stories may have multiple)
        for (const { url: mediaUrl } of urls) {
            const ext = mediaType === 'video' ? 'mp4' : 'jpg';
            const tempFile = path.join(tmpDir, `snap_${Date.now()}.${ext}`);

            try {
                const mediaRes = await axios({
                    method: 'GET',
                    url: mediaUrl,
                    responseType: 'stream',
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                        'Referer': 'https://snapmate.io/'
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

                if (mediaType === 'video') {
                    await sock.sendMessage(chatId, {
                        video: { url: tempFile },
                        mimetype: 'video/mp4',
                        caption
                    }, { quoted: getFakeVcard() });
                } else {
                    await sock.sendMessage(chatId, {
                        image: { url: tempFile },
                        caption
                    }, { quoted: getFakeVcard() });
                }

                try { fs.unlinkSync(tempFile); } catch (_) {}

            } catch (itemErr) {
                console.error('[SNAP] Failed to send item:', itemErr.message);
                try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch (_) {}
            }
        }

        // Done reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('[SNAP] Error:', error.message);
        await sock.sendMessage(chatId, {
            text: `❌ Failed to download the snap.\n\n_${error.message}_`
        }, { quoted: getFakeVcard() });
    }
}

module.exports = snapCommand;
