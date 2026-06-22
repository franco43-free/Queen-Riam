const fs = require("fs");
const path = require("path");
const os = require("os");
const ffmpeg = require("fluent-ffmpeg");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { Buffer } = require("buffer");
const getFakeVcard = require('../lib/fakeVcard');
const { getLang } = require('../lib/lang');

function formatDuration(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}m ${s}s`;
}

async function trimCommand(sock, chatId, message, args) {
    const quoted = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quoted?.videoMessage && !quoted?.audioMessage) {
        await sock.sendMessage(chatId, { text: getLang(sock).trim_no_media }, { quoted: getFakeVcard() });
        return;
    }

    try {
        // Download media
        const type = quoted.videoMessage ? "video" : "audio";
        const stream = await downloadContentFromMessage(quoted[type + "Message"], type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        // Save to temp file
        const inputFile = path.join(os.tmpdir(), `input_${Date.now()}.${type === "video" ? "mp4" : "mp3"}`);
        const outputFile = path.join(os.tmpdir(), `output_${Date.now()}.${type === "video" ? "mp4" : "mp3"}`);
        fs.writeFileSync(inputFile, buffer);

        // If no args, show duration + help
        if (!args[0] || !args[1]) {
            return new Promise((resolve, reject) => {
                ffmpeg.ffprobe(inputFile, async (err, metadata) => {
                    if (err) {
                        await sock.sendMessage(chatId, { text: getLang(sock).trim_duration_failed }, { quoted: getFakeVcard() });
                        return reject(err);
                    }
                    const duration = metadata.format.duration;
                    await sock.sendMessage(chatId, {
                        text: getLang(sock).trim_usage.replace('{duration}', formatDuration(duration))
                    }, { quoted: getFakeVcard() });
                    resolve();
                });
            });
        }

        // Parse start/end
        const start = parseInt(args[0]);
        const end = parseInt(args[1]);
        if (isNaN(start) || isNaN(end) || start >= end) {
            await sock.sendMessage(chatId, { text: getLang(sock).trim_invalid_format }, { quoted: getFakeVcard() });
            return;
        }

        // Trim media
        await sock.sendMessage(chatId, { react: { text: "⏳", key: message.key } });

        return new Promise((resolve, reject) => {
            ffmpeg(inputFile)
                .setStartTime(start)
                .setDuration(end - start)
                .output(outputFile)
                .on("end", async () => {
                    const data = fs.readFileSync(outputFile);

                    // Send back trimmed media
                    if (type === "video") {
                        await sock.sendMessage(chatId, { video: data, mimetype: "video/mp4" }, { quoted: getFakeVcard() });
                    } else {
                        await sock.sendMessage(chatId, { audio: data, mimetype: "audio/mpeg" }, { quoted: getFakeVcard() });
                    }

                    await sock.sendMessage(chatId, { react: { text: "✅", key: message.key } });

                    fs.unlinkSync(inputFile);
                    fs.unlinkSync(outputFile);
                    resolve();
                })
                .on("error", async (err) => {
                    console.error("Trim error:", err);
                    await sock.sendMessage(chatId, { react: { text: "❌", key: message.key } });
                    await sock.sendMessage(chatId, { text: getLang(sock).trim_failed }, { quoted: getFakeVcard() });
                    reject(err);
                })
                .run();
        });

    } catch (err) {
        console.error("trimCommand error:", err);
        await sock.sendMessage(chatId, { text: getLang(sock).trim_error }, { quoted: getFakeVcard() });
    }
}

module.exports = trimCommand;