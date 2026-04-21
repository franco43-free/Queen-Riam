const { igdl } = require("ruhend-scraper");
const getFakeVcard = require('../lib/fakeVcard');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

async function instagramCommand(sock, chatId, message) {
    try {
        if (processedMessages.has(message.key.id)) return;
        processedMessages.add(message.key.id);
        setTimeout(() => processedMessages.delete(message.key.id), 5 * 60 * 1000);

        // ✅ Step 1: Get text from command message
        let directText =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            "";

        // Remove ".ig" or ".instagram" prefix if command used
        const args = directText.trim().split(" ").slice(1).join(" ");
        let url = args.trim();

        // ✅ Step 2: If no args, fallback to quoted message text
        if (!url && message.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quoted = message.message.extendedTextMessage.contextInfo.quotedMessage;
            url =
                quoted.conversation ||
                quoted.extendedTextMessage?.text ||
                quoted.imageMessage?.caption ||
                quoted.videoMessage?.caption ||
                "";
            url = url.trim();
        }

        // ✅ Step 3: If still no text
        if (!url) {
            return await sock.sendMessage(
                chatId,
                { text: "📌 Usage: Send or reply to an Instagram post/reel/video link.\nExample:\n.ig https://instagram.com/reel/xxxx" },
                { quoted: getFakeVcard() }
            );
        }

        // ✅ Step 4: Validate Instagram link
        const instagramPatterns = [
            /https?:\/\/(?:www\.)?instagram\.com\//,
            /https?:\/\/(?:www\.)?instagr\.am\//,
            /https?:\/\/(?:www\.)?instagram\.com\/p\//,
            /https?:\/\/(?:www\.)?instagram\.com\/reel\//,
            /https?:\/\/(?:www\.)?instagram\.com\/tv\//
        ];

        const isValidUrl = instagramPatterns.some((pattern) => pattern.test(url));
        if (!isValidUrl) {
            return await sock.sendMessage(
                chatId,
                { text: "⚠️ Please provide a valid Instagram link (post, reel, or video)." },
                { quoted: getFakeVcard() }
            );
        }

        // React 🔄 while processing
        await sock.sendMessage(chatId, { react: { text: "🔄", key: message.key } });

        // ✅ Step 5: Fetch media
        const downloadData = await igdl(url);
        if (!downloadData?.data?.length) {
            return await sock.sendMessage(
                chatId,
                { text: "❌ No media found at the provided link." },
                { quoted: getFakeVcard() }
            );
        }

        const caption = `〽️ ᴅᴏᴡɴʟᴏᴀᴅᴇᴅ ʙʏ *ǫᴜᴇᴇɴ ʀɪᴀᴍ*`;

        for (let i = 0; i < Math.min(20, downloadData.data.length); i++) {
            const media = downloadData.data[i];
            const mediaUrl = media.url;

            const isVideo =
                /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) ||
                media.type === "video" ||
                url.includes("/reel/") ||
                url.includes("/tv/");

            if (isVideo) {
                await sock.sendMessage(
                    chatId,
                    {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption
                    },
                    { quoted: getFakeVcard() }
                );
            } else {
                await sock.sendMessage(
                    chatId,
                    {
                        image: { url: mediaUrl },
                        caption
                    },
                    { quoted: getFakeVcard() }
                );
            }
        }

        await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
    } catch (error) {
        console.error("Error in Instagram command:", error);
        await sock.sendMessage(
            chatId,
            { text: "❌ An error occurred while processing your request." },
            { quoted: getFakeVcard() }
        );
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
    }
}

module.exports = instagramCommand;