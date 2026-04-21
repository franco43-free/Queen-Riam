const axios = require('axios');
const getFakeVcard = require('../lib/fakeVcard');

const processedMessages = new Set();

async function resolveTikTokUrl(url) {
    try {
        const response = await axios.get(url, { maxRedirects: 0, validateStatus: null });
        if (response.status >= 300 && response.status < 400 && response.headers.location) {
            return response.headers.location;
        }
    } catch (e) {
        console.error("URL resolution failed:", e.message);
    }
    return url;
}

async function tiktokCommand(sock, chatId, message) {
    try {
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        const directText = message.message?.conversation || message.message?.extendedTextMessage?.text || "";
        let url = directText.trim().split(" ").slice(1).join(" ").trim();

        if (!url) {
            const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            url = (
                quoted?.conversation ||
                quoted?.extendedTextMessage?.text ||
                quoted?.imageMessage?.caption ||
                quoted?.videoMessage?.caption ||
                ""
            ).trim();
        }

        if (!url) {
            return await sock.sendMessage(chatId, {
                text: "❌ Please provide a TikTok link!\nExample: `.tiktok https://vt.tiktok.com/xxxxx`"
            }, { quoted: getFakeVcard() });
        }

        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        if (!tiktokPatterns.some(p => p.test(url))) {
            return await sock.sendMessage(chatId, {
                text: "❌ That is not a valid TikTok link."
            }, { quoted: getFakeVcard() });
        }

        const finalUrl = await resolveTikTokUrl(url);

        const apiResponse = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(finalUrl)}`);
        const data = apiResponse.data;

        if (data?.code !== 0 || !data?.data?.play) {
            return await sock.sendMessage(chatId, {
                text: "❌ Failed to download the TikTok video. Please try again with a different link."
            }, { quoted: getFakeVcard() });
        }

        const { title, play, cover, author } = data.data;
        const authorName = author?.nickname || 'Unknown';

        if (cover) {
            await sock.sendMessage(chatId, {
                image: { url: cover },
                caption: `🎵 *${title || 'TikTok Video'}*\n\n𝘿𝙤𝙬𝙣𝙡𝙤𝙖𝙙𝙞𝙣𝙜... 🎬\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʀɪᴀᴍ`
            }, { quoted: getFakeVcard() });
        }

        await sock.sendMessage(chatId, {
            video: { url: play },
            mimetype: "video/mp4",
            caption: `🎵 *${title || 'TikTok Video'}*\n👤 *${authorName}*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ǫᴜᴇᴇɴ ʀɪᴀᴍ`
        }, { quoted: getFakeVcard() });

    } catch (error) {
        console.error('TikTok command error:', error.message);
        await sock.sendMessage(chatId, {
            text: "❌ Download failed. Please try again later."
        }, { quoted: getFakeVcard() });
    }
}

module.exports = tiktokCommand;
