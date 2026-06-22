const axios = require("axios");
const { getLang } = require("../lib/lang");

const PAGE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Cookie": "age_verified=1; lang=en"
};

// Scrape video info directly from the XNXX page (no third-party download API needed)
async function scrapeXnxxPage(pageUrl) {
    const res = await axios.get(pageUrl, { timeout: 20000, headers: PAGE_HEADERS });
    const html = res.data;
    const contentUrlMatch = html.match(/"contentUrl":\s*"([^"]+\.mp4[^"]*)"/);
    const titleMatch = html.match(/html5player\.setVideoTitle\('([^']+)'\)/);
    const thumbMatch = html.match(/html5player\.setThumbUrl\('([^']+)'\)/);
    return {
        videoUrl: contentUrlMatch ? contentUrlMatch[1].replace(/\\u0026/g, "&") : null,
        title: titleMatch ? titleMatch[1] : null,
        thumbnail: thumbMatch ? thumbMatch[1] : null
    };
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

async function xnxxCommand(sock, chatId, query, message) {
    const WHATSAPP_LIMIT = 62 * 1024 * 1024;
    const MAX_SEND = 3;

    if (!query) {
        await sock.sendMessage(chatId, {
            text: "⚠️ Please provide a search keyword.\n\nExample:\n```xnxx hot video```"
        });
        return;
    }

    if (query.includes("xnxx.com")) {
        await sock.sendMessage(chatId, { text: getLang(sock).xnxx_no_url });
        return;
    }

    try {
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        const searchRes = await axios.get(
            "http://51.83.103.24:20035/search/xnxx?query=" + encodeURIComponent(query),
            { timeout: 30000 }
        );
        let videos = (searchRes.data && searchRes.data.result && searchRes.data.result.videos) || [];
        if (!videos.length) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            await sock.sendMessage(chatId, { text: getLang(sock).xnxx_not_found.replace("{query}", query) });
            return;
        }

        videos = shuffleArray(videos);

        let sentCount = 0;

        for (let i = 0; i < videos.length && sentCount < MAX_SEND; i++) {
            const video = videos[i];

            try {
                const info = await scrapeXnxxPage(video.page_url);
                if (!info.videoUrl) {
                    console.log("[xnxx] No video URL scraped from:", video.page_url);
                    continue;
                }

                // Check size before downloading
                let fileSize = null;
                try {
                    const head = await axios.head(info.videoUrl, {
                        timeout: 10000,
                        headers: { "User-Agent": "Mozilla/5.0" }
                    });
                    fileSize = parseInt(head.headers["content-length"] || 0);
                } catch {}

                if (fileSize && fileSize > WHATSAPP_LIMIT) {
                    console.log("[xnxx] Skipping too large:", Math.round(fileSize / 1024 / 1024) + "MB");
                    continue;
                }

                // Download video buffer (XNXX serves H.264 already — no re-encoding needed)
                const dlRes = await axios.get(info.videoUrl, {
                    responseType: "arraybuffer",
                    timeout: 120000,
                    headers: { "User-Agent": "Mozilla/5.0" }
                });
                const videoBuf = Buffer.from(dlRes.data);

                if (videoBuf.length > WHATSAPP_LIMIT) {
                    console.log("[xnxx] Post-download too large:", Math.round(videoBuf.length / 1024 / 1024) + "MB");
                    continue;
                }

                const title = info.title || video.title || "XNXX Video";
                const caption = "🎬 *" + title + "*\n🔞 *18+ Only*\n\n> *_Downloaded by Queen Riam_*";

                if (info.thumbnail) {
                    await sock.sendMessage(chatId, {
                        image: { url: info.thumbnail },
                        caption: "🎬 *" + title + "*\n🔞 *18+ Only*"
                    });
                }

                await sock.sendMessage(chatId, {
                    video: videoBuf,
                    mimetype: "video/mp4",
                    fileName: title.replace(/[^a-zA-Z0-9\-_ ]/g, "").trim() + ".mp4",
                    caption
                });

                sentCount++;

            } catch (err) {
                console.error("[xnxx] Failed for", video.page_url, ":", err.message);
            }
        }

        if (sentCount === 0) {
            await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
            await sock.sendMessage(chatId, { text: "❌ Couldn't find any videos small enough to send. Try a different keyword." });
        } else {
            await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });
            await sock.sendMessage(chatId, {
                text: getLang(sock).xnxx_success.replace("{count}", sentCount).replace("{query}", query)
            });
        }

    } catch (error) {
        console.error("[xnxx] Main error:", error.message);
        await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
        await sock.sendMessage(chatId, { text: "❌ An error occurred while processing your request." });
    }
}

module.exports = { xnxxCommand };
