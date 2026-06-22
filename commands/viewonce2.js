const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

/**
 * View-once bypass.
 * silent=true -> no error/confirmation sent.
 * targetJid   -> where to send the media (defaults to sock.user.id if omitted).
 */
async function viewonce2(sock, chatId, message, silent = false, targetJid = null) {
    try {
        const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const viewOnce = quoted?.viewOnceMessageV2?.message
                      || quoted?.viewOnceMessageV2Extension?.message
                      || quoted;

        const quotedImage = viewOnce?.imageMessage;
        const quotedVideo = viewOnce?.videoMessage;

        if (!quotedImage && !quotedVideo) return;

        const destJid = targetJid || sock.user.id;

        let content;
        if (quotedImage) {
            const stream = await downloadContentFromMessage(quotedImage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            content = { image: buffer, fileName: 'media.jpg', caption: quotedImage.caption || '' };
        } else if (quotedVideo) {
            const stream = await downloadContentFromMessage(quotedVideo, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            content = { video: buffer, fileName: 'media.mp4', caption: quotedVideo.caption || '' };
        }

        if (content) await sock.sendMessage(destJid, content);
    } catch (err) {
        if (!silent) console.error('viewonce2 error:', err.message);
    }
}

module.exports = viewonce2;
